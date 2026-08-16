"""Shared test configuration for the agent runtime."""

from collections.abc import Iterator

import pytest

from axiom.config import get_settings


@pytest.fixture(autouse=True)
def test_settings(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Provide non-secret placeholders for settings-required unit tests."""

    # localhost selects LedgerClient's in-memory implementation; no test
    # should attempt to contact a real Supabase project.
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "test-only-service-key")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
