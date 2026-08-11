"""Tests for the Sudhaar planning agent — critical separation of duties checks."""

import pytest

from axiom.agents.base import AutonomyLevel
from axiom.agents.sudhaar import SudhaarAgent, SudhaarInput


@pytest.mark.asyncio
async def test_sudhaar_has_no_mutate_capability():
    agent = SudhaarAgent()
    # ADR-3: the planning agent holds NO write credentials
    assert agent.can_mutate is False
    # And it's at L1 (proposes only)
    assert agent.autonomy == AutonomyLevel.L1


@pytest.mark.asyncio
async def test_sudhaar_generates_actions_with_rollback_for_each():
    agent = SudhaarAgent()
    findings = [
        {
            "id": "f1",
            "control_id": "DPDPA-CNS-001",
            "title": "Obtain specific, informed, unambiguous consent",
            "severity": "critical",
            "risk_points": 30.0,
            "remediation_patterns": ["consent"],
        },
        {
            "id": "f2",
            "control_id": "DPDPA-SEC-001",
            "title": "Implement reasonable security safeguards",
            "severity": "critical",
            "risk_points": 50.0,
            "remediation_patterns": ["config"],
        },
    ]
    out = await agent.invoke(
        SudhaarInput(
            tenant_id="t1",
            engagement_id="e1",
            title="Test plan",
            findings=findings,
        )
    )
    assert out.status == "succeeded"
    actions = out.output["actions"]
    assert len(actions) == 2
    # Every action MUST have a rollback plan
    for action in actions:
        assert "rollback" in action
        assert action["rollback"]["type"] == "typed"
        assert len(action["rollback"]["steps"]) >= 1
        # Rollback is NOT yet validated as executable (this happens at dry-run time)
        assert action["rollback"]["validatedExecutable"] is False


@pytest.mark.asyncio
async def test_sudhaar_escalates_on_high_blast_radius():
    agent = SudhaarAgent()
    findings = [
        {
            "id": "f1",
            "control_id": "DPDPA-SEC-001",
            "title": "Reasonable security",
            "severity": "critical",
            "risk_points": 100.0,  # extreme
            "remediation_patterns": ["config"],
        }
    ]
    out = await agent.invoke(
        SudhaarInput(
            tenant_id="t1",
            engagement_id="e1",
            title="Large plan",
            findings=findings,
            blast_radius_cap_records=10,  # cap is well below projected blast (100 * 100 = 10000)
        )
    )
    assert out.status == "succeeded"
    # The agent should escalate because the aggregate blast radius exceeds the cap
    assert out.output["escalate"] is True
    assert "blast_radius" in (out.output.get("escalation_reason") or "")
