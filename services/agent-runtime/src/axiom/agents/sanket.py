"""Sanket — the Market Signal Agent.

"I find who's about to buy."

Sanket reads public sources (hiring posts, tender notices,
regulatory filings) for buying-intent signals relevant to DPDPA.
Internal-only — used to fuel the founder's GTM.

This is intentionally NOT exposed to customer tenants. The agent
exists to support the founder's outbound motion.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, ClassVar

from pydantic import BaseModel, Field

from .base import AgentName, AutonomyLevel, BaseAgent


class BuyingSignal(BaseModel):
    source: str
    company: str
    signal: str  # e.g. "DPO role posted", "Privacy RFP issued"
    detected_at: str
    score: int  # 0-100
    context: str = ""
    url: str | None = None


class SanketInput(BaseModel):
    sectors: list[str] = Field(default_factory=lambda: ["BFSI", "Healthcare", "SaaS / Tech"])
    geo: str = "India"
    since: str | None = None  # ISO datetime; default last 14 days


class SanketOutput(BaseModel):
    signals: list[BuyingSignal]
    high_intent: list[BuyingSignal]
    notes: str = ""


class SanketAgent(BaseAgent[SanketInput, SanketOutput]):
    name: ClassVar[AgentName] = AgentName.SANKET
    description: ClassVar[str] = "Detect buying-intent signals from public sources (internal GTM)."
    one_liner: ClassVar[str] = "I find who's about to buy."
    tool_scopes: ClassVar[tuple[str, ...]] = ("http.read.public_sources",)
    autonomy: ClassVar[AutonomyLevel] = AutonomyLevel.L1
    default_task_kind: ClassVar[Any] = "structural"
    default_pii_redact: ClassVar[bool] = False

    def input_schema(self) -> type[SanketInput]:
        return SanketInput

    def output_schema(self) -> type[SanketOutput]:
        return SanketOutput

    async def _run(
        self, *, correlation_id: str, input: SanketInput, **deps: Any
    ) -> SanketOutput:
        # Phase 0/1 stub. Phase 4 turns this on with real scrapers.
        return SanketOutput(
            signals=[],
            high_intent=[],
            notes=(
                "Sanket is in stub mode (Phase 0/1). Real scraping wired up "
                "in Phase 4 with appropriate rate-limiting and ToS awareness."
            ),
        )
