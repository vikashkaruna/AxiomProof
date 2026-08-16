"""Typed local core for Delivery Playbook Capture.

Persistence, reporting, and ranking across engagements are application
concerns and remain explicit integration work in the Phase 2 report.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class PlaybookEntry(BaseModel):
    task_name: str = Field(min_length=1, max_length=200)
    source: str = Field(min_length=1, max_length=100)
    duration_minutes: int = Field(ge=0)
    repetitions: int = Field(default=1, ge=1)
    notes: str = ""
    automation_candidate: bool = False

    @property
    def annual_minutes(self) -> int:
        return self.duration_minutes * self.repetitions


def rank_playbook_backlog(entries: list[PlaybookEntry]) -> list[PlaybookEntry]:
    """Rank repeated time cost first, preserving input order for ties."""
    return sorted(entries, key=lambda entry: entry.annual_minutes, reverse=True)
