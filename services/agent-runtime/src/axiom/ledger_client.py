"""Append-only audit ledger client (Python).

Mirrors packages/ledger/src/append.ts. Used by every agent to write
to the hash-chained audit ledger. Writes go through the Postgres
SECURITY DEFINER function `append_ledger()`.

This module never bypasses the function — the only INSERT path is
via the RPC, which is enforced at the DB role level too.
"""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal

from supabase import Client, create_client

from .canonicalise import canonical_json, sha256_hex
from .config import Settings, get_settings


ActorType = Literal["agent", "human", "system"]
LedgerResult = Literal["success", "failure", "rolled_back", "skipped", "pending"]


@dataclass(frozen=True)
class AppendInput:
    tenant_id: str
    correlation_id: str
    actor_type: ActorType
    actor_id: str
    action_type: str
    result: LedgerResult = "pending"
    agent_version: str | None = None
    model_id: str | None = None
    prompt_hash: str | None = None
    target_ref: str | None = None
    input_hash: str | None = None
    output_hash: str | None = None
    approval_token_id: str | None = None
    approver_id: str | None = None
    pre_state_ref: str | None = None
    post_state_ref: str | None = None
    detail: dict[str, Any] | None = None


@dataclass(frozen=True)
class AppendResult:
    id: str
    occurred_at: datetime


class LedgerClient:
    """Append-only audit ledger client.

    The constructor accepts either a Supabase client (production) or
    `in_memory=True` (tests). The in-memory implementation is faithful
    to the production contract — same hash chain, same shape — but
    doesn't reach a network.
    """

    def __init__(self, client: Client | None = None, *, in_memory: bool = False):
        self._client = client
        self._in_memory = in_memory
        self._mem: list[dict] = []
        self._mem_chains: dict[str, dict[str, str | int]] = {}

    @classmethod
    def from_settings(cls, settings: Settings | None = None) -> "LedgerClient":
        s = settings or get_settings()
        if s.supabase_url.startswith("http://localhost") or s.supabase_url.startswith("http://127."):
            # Local dev — don't try to connect to Supabase on import.
            return cls(in_memory=True)
        try:
            client = create_client(s.supabase_url, s.supabase_service_key)
            return cls(client)
        except Exception:
            return cls(in_memory=True)

    @classmethod
    def in_memory(cls) -> "LedgerClient":
        return cls(in_memory=True)

    @property
    def in_memory_mode(self) -> bool:
        return self._in_memory

    @property
    def memory_entries(self) -> list[dict]:
        """In-memory ledger entries (test-only)."""
        return list(self._mem)

    async def append(self, input: AppendInput) -> AppendResult:
        if self._in_memory:
            return self._append_in_memory(input)
        return await self._append_remote(input)

    def _append_in_memory(self, input: AppendInput) -> AppendResult:
        import time
        from datetime import datetime as _dt
        from .canonicalise import canonical_json as _cj

        detail = input.detail or {}
        input_hash = input.input_hash or sha256_hex(_cj({**detail, "_kind": "input"}))
        output_hash = input.output_hash or sha256_hex(_cj({**detail, "_kind": "output"}))

        chain = self._mem_chains.setdefault(input.tenant_id, {"last_seq": 0, "last_hash": None})
        seq = int(chain["last_seq"]) + 1
        prev_hash = chain["last_hash"]
        ts = _dt.utcnow().isoformat()
        payload = "|".join(
            [
                str(seq),
                input.correlation_id,
                input.actor_type,
                input.actor_id,
                str(input.agent_version or ""),
                str(input.model_id or ""),
                str(input.prompt_hash or ""),
                input.action_type,
                str(input.target_ref or ""),
                str(input.input_hash or input_hash),
                str(input.output_hash or output_hash),
                str(input.approval_token_id or ""),
                str(input.approver_id or ""),
                str(input.pre_state_ref or ""),
                str(input.post_state_ref or ""),
                input.result,
                ts,
                str(prev_hash or ""),
                str(detail),
            ]
        )
        entry_hash = sha256_hex(payload)
        entry = {
            "tenant_id": input.tenant_id,
            "sequence_no": seq,
            "correlation_id": input.correlation_id,
            "actor_type": input.actor_type,
            "actor_id": input.actor_id,
            "agent_version": input.agent_version,
            "model_id": input.model_id,
            "prompt_hash": input.prompt_hash,
            "action_type": input.action_type,
            "target_ref": input.target_ref,
            "input_hash": input_hash,
            "output_hash": output_hash,
            "approval_token_id": input.approval_token_id,
            "approver_id": input.approver_id,
            "pre_state_ref": input.pre_state_ref,
            "post_state_ref": input.post_state_ref,
            "result": input.result,
            "detail": detail,
            "occurred_at": ts,
            "prev_entry_hash": prev_hash,
            "entry_hash": entry_hash,
        }
        self._mem.append(entry)
        chain["last_seq"] = seq
        chain["last_hash"] = entry_hash
        return AppendResult(id=f"mem-{len(self._mem)}", occurred_at=_dt.fromisoformat(ts))

    async def _append_remote(self, input: AppendInput) -> AppendResult:
        detail = input.detail or {}

        # Compute input/output hashes from the canonical detail (if not provided)
        input_hash = input.input_hash or sha256_hex(
            canonical_json({**detail, "_kind": "input"})
        )
        output_hash = input.output_hash or sha256_hex(
            canonical_json({**detail, "_kind": "output"})
        )

        rpc = self._client.rpc(  # type: ignore[union-attr]
            "append_ledger",
            {
                "p_tenant_id": input.tenant_id,
                "p_correlation_id": input.correlation_id,
                "p_actor_type": input.actor_type,
                "p_actor_id": input.actor_id,
                "p_agent_version": input.agent_version,
                "p_model_id": input.model_id,
                "p_prompt_hash": input.prompt_hash,
                "p_action_type": input.action_type,
                "p_target_ref": input.target_ref,
                "p_input_hash": input_hash,
                "p_output_hash": output_hash,
                "p_approval_token_id": input.approval_token_id,
                "p_approver_id": input.approver_id,
                "p_pre_state_ref": input.pre_state_ref,
                "p_post_state_ref": input.post_state_ref,
                "p_result": input.result,
                "p_detail": detail,
            },
        )
        result = rpc.execute()
        new_id = str(result.data) if result.data else "0"
        return AppendResult(id=new_id, occurred_at=datetime.utcnow())

    async def verify(
        self, tenant_id: str, from_sequence: int = 1
    ) -> dict[str, Any]:
        rpc = self._client.rpc(
            "verify_ledger",
            {"p_tenant_id": tenant_id, "p_from_sequence": from_sequence},
        )
        result = rpc.execute()
        rows = result.data or []
        if not rows:
            return {"intact": True}
        first = rows[0]
        return {
            "intact": False,
            "firstBreak": {
                "sequenceNo": first["sequence_no"],
                "reason": first["reason"],
            },
        }

    async def query(
        self,
        *,
        tenant_id: str,
        from_sequence: int | None = None,
        to_sequence: int | None = None,
        from_time: str | None = None,
        to_time: str | None = None,
        actor_type: ActorType | None = None,
        actor_id: str | None = None,
        action_type: str | None = None,
        correlation_id: str | None = None,
        result: LedgerResult | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        q = (
            self._client.table("audit_ledger")
            .select("*")
            .eq("tenant_id", tenant_id)
            .order("sequence_no", desc=True)
        )
        if from_sequence is not None:
            q = q.gte("sequence_no", from_sequence)
        if to_sequence is not None:
            q = q.lte("sequence_no", to_sequence)
        if from_time:
            q = q.gte("occurred_at", from_time)
        if to_time:
            q = q.lte("occurred_at", to_time)
        if actor_type:
            q = q.eq("actor_type", actor_type)
        if actor_id:
            q = q.eq("actor_id", actor_id)
        if action_type:
            q = q.eq("action_type", action_type)
        if correlation_id:
            q = q.eq("correlation_id", correlation_id)
        if result:
            q = q.eq("result", result)
        q = q.limit(limit)
        if offset:
            q = q.range(offset, offset + limit - 1)
        r = q.execute()
        return r.data or []


def new_correlation_id() -> str:
    return str(uuid.uuid4())
