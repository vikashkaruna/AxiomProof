import pytest

from axiom.agents.drishti import DrishtiAgent, DrishtiInput, DrishtiOutput
from axiom.agents.vibhaag import VibhaagAgent, VibhaagInput, VibhaagOutput


@pytest.mark.asyncio
async def test_drishti_escalates_case_insensitive_sensitive_categories():
    output = await DrishtiAgent().invoke(
        DrishtiInput(
            tenant_id="t1",
            engagement_id="e1",
            systems=[{"name": "CRM", "type": "postgres", "data_categories": ["Children"]}],
        )
    )
    assert output.status == "succeeded"
    assert DrishtiOutput.model_validate(output.output).escalate is True


@pytest.mark.asyncio
async def test_vibhaag_accepts_documented_field_hint_shape():
    output = await VibhaagAgent().invoke(
        VibhaagInput(
            tenant_id="t1",
            engagement_id="e1",
            inventory=[{"name": "CRM", "data_categories": []}],
            field_hints={"CRM": {"email": {"category": "contact"}}},
        )
    )
    assert output.status == "succeeded"
    result = VibhaagOutput.model_validate(output.output)
    assert result.classifications[0].category == "contact"
    assert result.classifications[0].field_path == "CRM.email"
