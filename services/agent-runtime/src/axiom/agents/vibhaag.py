"""Vibhaag — the Classification Agent.

"I tell you what kind of data it is."

Vibhaag takes Drishti's output and classifies each field/record by
DPDPA category. Confidence scores are produced; low-confidence
classifications are routed to a human review queue.

In Phase 1, classification is rule-based + LLM-assisted. The agent
emits classifications with confidence; below a threshold, the field
goes to a human queue.
"""

from __future__ import annotations

from typing import Any, ClassVar

from pydantic import BaseModel, Field

from .base import AgentName, AutonomyLevel, BaseAgent


class FieldClassification(BaseModel):
    field_path: str
    system: str
    category: str  # 'identity' | 'contact' | 'government_id' | 'financial' | 'health' | 'children' | 'behavioural' | 'biometric' | 'other'
    sensitivity: str  # 'low' | 'medium' | 'high'
    confidence: float  # 0-1
    needs_review: bool
    rationale: str = ""


class VibhaagInput(BaseModel):
    tenant_id: str
    engagement_id: str
    inventory: list[dict[str, Any]] = Field(default_factory=list)
    field_hints: dict[str, dict[str, Any]] = Field(
        default_factory=dict,
        description="Per-system hints: {system_name: {field_name: {category?, sensitivity?}}}",
    )


class VibhaagOutput(BaseModel):
    total_fields: int
    classified: int
    needs_review_count: int
    classifications: list[FieldClassification]
    escalate: bool = False
    escalation_reason: str | None = None


# Pattern-based classifier used as the structural backbone
NAME_PATTERNS = {
    "government_id": ["aadhaar", "pan", "passport", "voter", "license", "ssn", "national_id"],
    "contact": ["email", "phone", "mobile", "address", "zip", "postal"],
    "identity": ["name", "first_name", "last_name", "full_name", "dob", "date_of_birth", "gender"],
    "financial": ["bank", "account", "ifsc", "credit", "debit", "card", "upi", "salary"],
    "health": ["diagnosis", "icd", "medication", "blood", "weight", "height", "allergy"],
    "children": ["parent", "guardian", "minor", "child", "school_grade"],
    "behavioural": ["browsing", "search", "click", "view", "page", "session", "device_id", "ip"],
    "biometric": ["fingerprint", "face", "iris", "voice", "biometric"],
}


def pattern_classify(field_name: str) -> tuple[str, float]:
    """Quick structural classification by name pattern. Returns (category, confidence)."""
    n = field_name.lower()
    for category, patterns in NAME_PATTERNS.items():
        for p in patterns:
            if p in n:
                return category, 0.95
    return "other", 0.4


class VibhaagAgent(BaseAgent[VibhaagInput, VibhaagOutput]):
    name: ClassVar[AgentName] = AgentName.VIBHAAG
    description: ClassVar[str] = "Classify discovered data fields by DPDPA category."
    one_liner: ClassVar[str] = "I tell you what kind of data it is."
    tool_scopes: ClassVar[tuple[str, ...]] = ()  # operates on discovery output only
    autonomy: ClassVar[AutonomyLevel] = AutonomyLevel.L1
    default_task_kind: ClassVar[Any] = "classification"
    default_pii_redact: ClassVar[bool] = True

    def input_schema(self) -> type[VibhaagInput]:
        return VibhaagInput

    def output_schema(self) -> type[VibhaagOutput]:
        return VibhaagOutput

    async def _run(
        self, *, correlation_id: str, input: VibhaagInput, **deps: Any
    ) -> VibhaagOutput:
        classifications: list[FieldClassification] = []
        for system in input.inventory:
            sys_name = system.get("name", "unknown")
            data_categories = system.get("data_categories", []) or []
            fields = input.field_hints.get(sys_name, {}).get("fields", [])

            for field in fields:
                field_name = field if isinstance(field, str) else field.get("name", "")
                # Prefer caller hint if present
                if isinstance(field, dict):
                    cat = field.get("category")
                    sens = field.get("sensitivity", "medium")
                else:
                    cat, sens = None, "medium"
                if not cat:
                    cat, conf = pattern_classify(field_name)
                else:
                    conf = 0.99
                classifications.append(
                    FieldClassification(
                        field_path=f"{sys_name}.{field_name}",
                        system=sys_name,
                        category=cat,
                        sensitivity=sens,
                        confidence=conf,
                        needs_review=conf < 0.7 or cat == "other",
                        rationale=(
                            f"Pattern match (conf {conf:.2f})"
                            if conf < 0.99
                            else f"Caller-provided hint (conf {conf:.2f})"
                        ),
                    )
                )

        # If there are no fields, synthesise a coarse classification
        # from data_categories on the system (e.g. Drishti said this
        # system handles "children" — flag children for review)
        if not classifications:
            for system in input.inventory:
                sys_name = system.get("name", "unknown")
                for cat in system.get("data_categories", []) or []:
                    if cat in NAME_PATTERNS:
                        classifications.append(
                            FieldClassification(
                                field_path=f"{sys_name}.*",
                                system=sys_name,
                                category=cat,
                                sensitivity="high" if cat in {"children", "health", "biometric", "government_id"} else "medium",
                                confidence=0.6,
                                needs_review=True,
                                rationale="Inferred from system-level data_categories; field-level classification required.",
                            )
                        )

        needs_review = [c for c in classifications if c.needs_review]

        escalate = any(c.category == "children" and c.confidence >= 0.9 for c in classifications)
        escalation_reason = (
            "ambiguous_field: children-data fields detected" if escalate else None
        )

        return VibhaagOutput(
            total_fields=len(classifications),
            classified=len([c for c in classifications if c.confidence >= 0.7]),
            needs_review_count=len(needs_review),
            classifications=classifications,
            escalate=escalate,
            escalation_reason=escalation_reason,
        )
