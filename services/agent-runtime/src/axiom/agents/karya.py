"""Karya — the Execution Agent.

"I only act on your approval."

Karya is the only mutating agent. It executes ONLY actions covered
by a signed, scope-bound approval token validated per action (not
per batch). Every step logs pre- and post-state to the evidence
vault; the post-execution verification agent confirms the gap
actually closed.

Phase 0/1: stub. Phase 3 turns this on with a typed action catalogue
and connector-driven execution. The agent refuses to run without a
valid approval token; the validation logic is in the BFF.

Per ADR-2 (mirror): Karya is the gate. Approval is architectural.
"""

from __future__ import annotations

from typing import Any, ClassVar

from pydantic import BaseModel, Field

from .base import AgentName, AutonomyLevel, BaseAgent


class KaryaInput(BaseModel):
    tenant_id: str
    plan_id: str
    action_id: str
    approval_token: dict[str, Any] = Field(
        ...,
        description="The signed approval token, including spec and signature",
    )
    parameters: dict[str, Any] = Field(default_factory=dict)


class KaryaOutput(BaseModel):
    action_id: str
    status: str  # 'succeeded' | 'failed' | 'rolled_back' | 'skipped' | 'denied'
    pre_state_uri: str | None = None
    post_state_uri: str | None = None
    error: str | None = None
    notes: str = ""


class KaryaAgent(BaseAgent[KaryaInput, KaryaOutput]):
    name: ClassVar[AgentName] = AgentName.KARYA
    description: ClassVar[str] = "Execute an approved action (Phase 3, stub in Phase 0/1)."
    one_liner: ClassVar[str] = "I only act on your approval."
    tool_scopes: ClassVar[tuple[str, ...]] = (
        "connector.write",
        "evidence.write",
        "rollback.execute",
    )
    autonomy: ClassVar[AutonomyLevel] = AutonomyLevel.L2
    # Karya is the ONLY mutating agent. It requires an approval token.
    can_mutate: ClassVar[bool] = True
    default_task_kind: ClassVar[Any] = "structural"
    default_pii_redact: ClassVar[bool] = True

    def input_schema(self) -> type[KaryaInput]:
        return KaryaInput

    def output_schema(self) -> type[KaryaOutput]:
        return KaryaOutput

    async def _run(
        self, *, correlation_id: str, input: KaryaInput, **deps: Any
    ) -> KaryaOutput:
        # Phase 0/1 stub: refuse to execute without explicit phase
        # activation. The BFF gates all real execution in Phase 3+.
        if not self.settings.feature_execution_engine:
            return KaryaOutput(
                action_id=input.action_id,
                status="denied",
                error="Karya is disabled in current phase (feature_execution_engine=false)",
                notes="Karya refuses to run in Phase 0/1. Enable when moving to Phase 3.",
            )

        # Validate the approval token signature via the approval engine
        from ..approval_engine import ApprovalEngine  # type: ignore[attr-defined]

        engine = ApprovalEngine(
            signing_key=self.settings.approval_signing_key,
        )
        verification = await engine.verify(input.tenant_id, input.approval_token)
        if not verification.valid:
            return KaryaOutput(
                action_id=input.action_id,
                status="denied",
                error=f"Token invalid: {verification.reason}",
            )

        spec = input.approval_token.get("spec", {})
        if spec.get("planId") != input.plan_id:
            return KaryaOutput(
                action_id=input.action_id,
                status="denied",
                error="Token was not issued for this plan",
            )
        if input.action_id not in spec.get("actionIds", []):
            return KaryaOutput(
                action_id=input.action_id,
                status="denied",
                error="Action is not covered by the approval token",
            )

        # Token valid. Phase 3+ would now dispatch to the typed action
        # catalogue (connector-driven for data actions, file system
        # for policy publishing, etc.). For Phase 0/1 we record the
        # intent and return a dry-run-equivalent.
        return KaryaOutput(
            action_id=input.action_id,
            status="skipped",
            notes=(
                "Phase 0/1 stub: token validated; execution deferred until "
                "Phase 3 connector framework is online. The intent is "
                "recorded in the audit ledger."
            ),
        )
