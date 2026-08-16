"""Reviewable policy and notice drafts derived from RoPA records."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .ropa_generator import RopaRecord


class PolicyDraft(BaseModel):
    kind: Literal["privacy_notice", "retention_policy"]
    title: str
    sections: list[dict[str, str]] = Field(default_factory=list)
    source_activity_ids: list[str] = Field(default_factory=list)
    review_required: bool = True
    legal_review_required: bool = True


def build_privacy_notice(organisation_name: str, records: list[RopaRecord]) -> PolicyDraft:
    activities = "; ".join(record.system for record in records) or "No processing activities recorded"
    categories = sorted({category for record in records for category in record.data_categories})
    return PolicyDraft(
        kind="privacy_notice",
        title=f"Draft Privacy Notice — {organisation_name}",
        sections=[
            {"heading": "Processing activities", "body": activities},
            {"heading": "Data categories", "body": ", ".join(categories) or "To be confirmed"},
            {
                "heading": "Rights and contact details",
                "body": "To be completed by the Data Fiduciary before publication.",
            },
        ],
        source_activity_ids=[record.activity_id for record in records],
    )


def build_retention_policy(organisation_name: str, records: list[RopaRecord]) -> PolicyDraft:
    return PolicyDraft(
        kind="retention_policy",
        title=f"Draft Retention Policy — {organisation_name}",
        sections=[
            {
                "heading": record.system,
                "body": f"Retention: {record.retention_period}. Purpose: {record.purpose}.",
            }
            for record in records
        ],
        source_activity_ids=[record.activity_id for record in records],
    )
