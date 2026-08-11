"""Drishti — the Discovery Agent.

"I find what you didn't know you had."

Drishti runs discovery across your systems. In Phase 1, this is
interview-driven: the founder or operator answers a structured
questionnaire and Drishti normalises the answers into a system
inventory. In Phase 2, this connects to live read-only data sources.

Per ADR-3 (mirror): Drishti is read-only. It can write evidence and
inventory rows but cannot mutate client systems.
"""

from __future__ import annotations

from typing import Any, ClassVar

from pydantic import BaseModel, Field

from .base import AgentName, AutonomyLevel, BaseAgent


class SystemRecord(BaseModel):
    name: str
    type: str  # postgres, mysql, s3, gdrive, m365, salesforce, etc.
    description: str = ""
    hosts_personal_data: bool = False
    data_categories: list[str] = Field(default_factory=list)
    cross_border: bool = False
    processor: str | None = None
    evidence_refs: list[str] = Field(default_factory=list)


class DrishtiInput(BaseModel):
    tenant_id: str
    engagement_id: str
    interview: dict[str, Any] = Field(
        default_factory=dict,
        description="Structured answers from the discovery interview",
    )
    systems: list[SystemRecord] = Field(default_factory=list)


class DrishtiOutput(BaseModel):
    system_count: int
    personal_data_systems: int
    cross_border_systems: int
    inventory: list[SystemRecord]
    summary: str
    needs_live_connector: bool
    escalate: bool = False
    escalation_reason: str | None = None


class DrishtiAgent(BaseAgent[DrishtiInput, DrishtiOutput]):
    name: ClassVar[AgentName] = AgentName.DRISHTI
    description: ClassVar[str] = "Build a system inventory from interview data or live connectors."
    one_liner: ClassVar[str] = "I find what you didn't know you had."
    tool_scopes: ClassVar[tuple[str, ...]] = ("connector.read", "inventory.write", "evidence.write")
    autonomy: ClassVar[AutonomyLevel] = AutonomyLevel.L1
    default_task_kind: ClassVar[Any] = "structural"
    default_pii_redact: ClassVar[bool] = False  # structural only — no values

    def input_schema(self) -> type[DrishtiInput]:
        return DrishtiInput

    def output_schema(self) -> type[DrishtiOutput]:
        return DrishtiOutput

    async def _run(
        self, *, correlation_id: str, input: DrishtiInput, **deps: Any
    ) -> DrishtiOutput:
        # If interview is provided, normalise it; otherwise use the explicit systems
        if input.systems:
            inventory = input.systems
        else:
            # Light normalisation of free-text interview answers
            inventory = self._from_interview(input.interview)

        personal_data = [s for s in inventory if s.hosts_personal_data]
        cross_border = [s for s in inventory if s.cross_border]

        escalate = False
        escalation_reason: str | None = None
        # Escalate if children data was discovered
        for s in inventory:
            if "children" in s.data_categories:
                escalate = True
                escalation_reason = f"discovers_children_data: system '{s.name}' flagged"
                break
        # Escalate if health data was discovered
        for s in inventory:
            if "health" in s.data_categories:
                escalate = True
                escalation_reason = escalation_reason or f"discovers_health_data: system '{s.name}' flagged"
                break
        # Escalate if any cross-border transfer was discovered
        if any(s.cross_border for s in inventory):
            escalate = True
            escalation_reason = escalation_reason or "cross_border_transfer_detected"

        return DrishtiOutput(
            system_count=len(inventory),
            personal_data_systems=len(personal_data),
            cross_border_systems=len(cross_border),
            inventory=inventory,
            summary=(
                f"Discovered {len(inventory)} system(s); "
                f"{len(personal_data)} hold personal data; "
                f"{len(cross_border)} involve cross-border transfer."
            ),
            needs_live_connector=len(inventory) >= 3,
            escalate=escalate,
            escalation_reason=escalation_reason,
        )

    def _from_interview(self, interview: dict[str, Any]) -> list[SystemRecord]:
        # Very minimal Phase 1 normaliser. Phase 2 swaps in live
        # connector-driven discovery.
        systems: list[SystemRecord] = []
        for key, val in interview.items():
            if not isinstance(val, dict):
                continue
            systems.append(
                SystemRecord(
                    name=val.get("name", key),
                    type=val.get("type", "unknown"),
                    description=val.get("description", ""),
                    hosts_personal_data=bool(val.get("hosts_personal_data", False)),
                    data_categories=val.get("data_categories", []) or [],
                    cross_border=bool(val.get("cross_border", False)),
                    processor=val.get("processor"),
                )
            )
        return systems
