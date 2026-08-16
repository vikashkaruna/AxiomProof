"""Deterministic RoPA generation from discovery and classification output.

This is the local Phase 2 core. It deliberately leaves lawful basis,
retention, and transfer safeguards as review fields: inventing legal facts
from a system name would create an unsafe compliance record.
"""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, Field


class RopaRecord(BaseModel):
    activity_id: str
    system: str
    purpose: str
    data_items: list[str]
    data_categories: list[str]
    lawful_basis: str
    retention_period: str
    processors: list[str] = Field(default_factory=list)
    cross_border: bool = False
    transfer_safeguards: str | None = None
    evidence_refs: list[str] = Field(default_factory=list)
    review_required: bool = True


class RopaOutput(BaseModel):
    records: list[RopaRecord]
    generated_by: str = "vibhaag"
    review_required: bool = True


def build_ropa_records(
    inventory: list[dict[str, Any]],
    classifications: list[dict[str, Any]] | None = None,
) -> RopaOutput:
    """Build one reviewable RoPA activity per discovered system."""
    classifications = classifications or []
    by_system: dict[str, list[str]] = {}
    categories_by_system: dict[str, set[str]] = {}
    for item in classifications:
        system = str(item.get("system", "unknown"))
        field_path = str(item.get("field_path", ""))
        field_name = field_path.rsplit(".", 1)[-1] if field_path else "*"
        by_system.setdefault(system, []).append(field_name)
        category = item.get("category")
        if category:
            categories_by_system.setdefault(system, set()).add(str(category))

    records: list[RopaRecord] = []
    for index, system in enumerate(inventory, start=1):
        name = str(system.get("name") or f"system-{index}")
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or f"system-{index}"
        fields = list(dict.fromkeys(by_system.get(name, [])))
        categories = set(str(value).lower() for value in system.get("data_categories", []) or [])
        categories.update(categories_by_system.get(name, set()))
        processors = [str(system["processor"])] if system.get("processor") else []
        purpose = str(system.get("description") or "Purpose to be confirmed by the Data Fiduciary")
        review_required = not bool(fields and system.get("description"))
        cross_border = bool(system.get("cross_border", False))
        records.append(
            RopaRecord(
                activity_id=f"ropa-{slug}-{index}",
                system=name,
                purpose=purpose,
                data_items=fields or ["Unspecified — field inventory required"],
                data_categories=sorted(categories),
                lawful_basis="To be confirmed by the Data Fiduciary",
                retention_period="To be confirmed by the retention schedule",
                processors=processors,
                cross_border=cross_border,
                transfer_safeguards=("To be documented" if cross_border else None),
                evidence_refs=[str(ref) for ref in system.get("evidence_refs", []) or []],
                review_required=review_required or cross_border,
            )
        )
    return RopaOutput(records=records, review_required=True)
