"""Control library loader.

Loads the v0.1.0 control library from a generated JSON file (built by
`pnpm tsx scripts/build-controls-json.mjs` from the TypeScript source
of truth at packages/control-library/src/controls.ts).
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class ControlDomain(str, Enum):
    GOV = "GOV"
    CNS = "CNS"
    DAT = "DAT"
    RCD = "RCD"
    BRCH = "BRCH"
    XBR = "XBR"
    CHD = "CHD"
    SDF = "SDF"
    SEC = "SEC"
    RTN = "RTN"
    DPF = "DPF"
    AUD = "AUD"
    DPIA = "DPIA"


class ControlSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EvidenceType(str, Enum):
    DOCUMENT = "document"
    CONFIG = "config"
    SCREENSHOT = "screenshot"
    LOG = "log"
    ATTESTATION = "attestation"
    INTERVIEW = "interview"
    INVENTORY = "inventory"
    REPORT = "report"


@dataclass(frozen=True)
class ControlScoring:
    baseline: float
    weight: float
    penalty_points: float
    max_penalty_inr: int


@dataclass(frozen=True)
class ControlCitation:
    instrument: str
    reference: str
    url: str | None = None


@dataclass(frozen=True)
class ControlEvidenceRequirement:
    type: EvidenceType
    description: str
    retention: str | None = None


@dataclass(frozen=True)
class Control:
    id: str
    library_version: str
    title: str
    obligation: str
    domain: ControlDomain
    severity: ControlSeverity
    citations: tuple[ControlCitation, ...]
    evidence_required: tuple[ControlEvidenceRequirement, ...]
    assessment_questions: tuple[dict, ...]
    scoring: ControlScoring
    remediation_patterns: tuple[str, ...]
    tags: tuple[str, ...]
    sdf_only: bool
    children_only: bool
    introduced_in_version: str
    revised_in_version: str | None = None
    notes: str | None = None


def _parse_control(raw: dict) -> Control:
    citations = tuple(
        ControlCitation(
            instrument=c["instrument"],
            reference=c["reference"],
            url=c.get("url"),
        )
        for c in raw.get("citations", [])
    )
    evidence = tuple(
        ControlEvidenceRequirement(
            type=EvidenceType(e["type"]),
            description=e["description"],
            retention=e.get("retention"),
        )
        for e in raw.get("evidence_required", [])
    )
    scoring_raw = raw["scoring"]
    return Control(
        id=raw["id"],
        library_version=raw.get("library_version") or raw.get("introduced_in_version", "0.1.0"),
        title=raw["title"],
        obligation=raw["obligation"],
        domain=ControlDomain(raw["domain"]),
        severity=ControlSeverity(raw["severity"]),
        citations=citations,
        evidence_required=evidence,
        assessment_questions=tuple(raw.get("assessment_questions", [])),
        scoring=ControlScoring(
            baseline=scoring_raw["baseline"],
            weight=scoring_raw["weight"],
            penalty_points=scoring_raw["penaltyPoints"],
            max_penalty_inr=scoring_raw["maxPenaltyINR"],
        ),
        remediation_patterns=tuple(raw.get("remediation_patterns", [])),
        tags=tuple(raw.get("tags", [])),
        sdf_only=bool(raw.get("sdf_only", False)),
        children_only=bool(raw.get("children_only", False)),
        introduced_in_version=raw.get("introduced_in_version", "0.1.0"),
        revised_in_version=raw.get("revised_in_version"),
        notes=raw.get("notes"),
    )


class ControlLibrary:
    def __init__(self, version: str, controls: list[Control]):
        self.version = version
        self._controls: tuple[Control, ...] = tuple(controls)
        self._by_id: dict[str, Control] = {c.id: c for c in controls}

    def __len__(self) -> int:
        return len(self._controls)

    def __iter__(self):
        return iter(self._controls)

    def get(self, control_id: str) -> Control | None:
        return self._by_id.get(control_id)

    def filter(
        self,
        *,
        domain: ControlDomain | None = None,
        severity: ControlSeverity | None = None,
        sdf_only: bool | None = None,
        children_only: bool | None = None,
    ) -> list[Control]:
        out: list[Control] = []
        for c in self._controls:
            if domain is not None and c.domain != domain:
                continue
            if severity is not None and c.severity != severity:
                continue
            if sdf_only is not None and c.sdf_only != sdf_only:
                continue
            if children_only is not None and c.children_only != children_only:
                continue
            out.append(c)
        return out


def load_library_from_file(path: str | os.PathLike[str]) -> ControlLibrary:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    version = data.get("version") or data.get("library_version")
    if not version:
        raise ValueError(f"Library file {path} missing version")
    parsed = [_parse_control(c) for c in data.get("controls", [])]
    return ControlLibrary(version=version, controls=parsed)


_DEFAULT_LIB_PATH = (
    Path(__file__).parent / "data" / "controls.json"
)


def load_default_library() -> ControlLibrary:
    """Load the bundled v0.1.0 library.

    If services/agent-runtime/src/axiom/data/controls.json is missing,
    the agent runtime can still operate by loading the library from
    Supabase at startup. This function returns a minimal in-code
    library with one representative control so the agents have
    something to score against in test environments.
    """
    if _DEFAULT_LIB_PATH.exists():
        return load_library_from_file(_DEFAULT_LIB_PATH)
    # Minimal in-code fallback. Production loads from Supabase.
    fallback = [
        Control(
            id="DPDPA-GOV-001",
            library_version="0.1.0",
            title="Designate a data fiduciary accountable for DPDPA compliance",
            obligation=(
                "Every entity that determines the purpose and means of "
                "processing digital personal data is a Data Fiduciary and "
                "bears primary statutory accountability under Section 8."
            ),
            domain=ControlDomain.GOV,
            severity=ControlSeverity.CRITICAL,
            citations=(ControlCitation("DPDPA-2023", "Section 2(i), 2(k), 8(1)"),),
            evidence_required=(
                ControlEvidenceRequirement(
                    type=EvidenceType.DOCUMENT,
                    description="Board resolution or partnership deed naming the Data Fiduciary entity",
                ),
            ),
            assessment_questions=(
                {
                    "id": "Q1",
                    "prompt": "Is there a single legal entity formally identified as the Data Fiduciary?",
                    "type": "boolean",
                    "evidenceTypes": ["document", "config"],
                },
            ),
            scoring=ControlScoring(0, 1, 30, 25_00_00_000),
            remediation_patterns=("dpo-appointment", "review"),
            tags=("foundation", "always-applies"),
            sdf_only=False,
            children_only=False,
            introduced_in_version="0.1.0",
        ),
    ]
    return ControlLibrary(version="0.1.0", controls=fallback)
