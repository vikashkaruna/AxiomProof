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


@pytest.mark.asyncio
async def test_drishti_defaults_to_indian_region_ap_south_1():
    output = await DrishtiAgent().invoke(
        DrishtiInput(
            tenant_id="t1",
            engagement_id="e1",
            systems=[
                {
                    "name": "Production Customer DB",
                    "type": "postgres",
                    "description": "Core database holding user credentials and KYC docs",
                    "hosts_personal_data": True,
                    "data_categories": ["aadhaar", "pan", "phone", "email"],
                    "cross_border": False,
                }
            ],
        )
    )
    assert output.status == "succeeded"
    result = DrishtiOutput.model_validate(output.output)
    assert result.system_count == 1
    assert result.personal_data_systems == 1
    assert result.cross_border_systems == 0
    assert result.escalate is False
    assert result.inventory[0].region == "ap-south-1"
    assert result.inventory[0].cross_border is False
    assert len(result.warnings) == 0


@pytest.mark.asyncio
async def test_drishti_detects_foreign_region_in_description_and_overrides_cross_border():
    output = await DrishtiAgent().invoke(
        DrishtiInput(
            tenant_id="t1",
            engagement_id="e1",
            systems=[
                {
                    "name": "US Analytics S3 Bucket",
                    "type": "s3",
                    "description": "Log telemetry archive in us-east-1",
                    "hosts_personal_data": True,
                    "data_categories": ["ip_address", "telemetry"],
                    "cross_border": False,  # Operator erroneously claimed False
                }
            ],
        )
    )
    assert output.status == "succeeded"
    result = DrishtiOutput.model_validate(output.output)
    assert result.cross_border_systems == 1
    assert result.escalate is True
    assert result.escalation_reason == "cross_border_transfer_detected"
    assert result.inventory[0].region == "us-east-1"
    assert result.inventory[0].cross_border is True
    assert len(result.warnings) == 1
    assert "DPDPA-XBD-01" in result.warnings[0]
    assert "us-east-1" in result.warnings[0]
    assert "ap-south-1" in result.warnings[0]


@pytest.mark.asyncio
async def test_drishti_detects_explicit_foreign_region_and_warns():
    output = await DrishtiAgent().invoke(
        DrishtiInput(
            tenant_id="t1",
            engagement_id="e1",
            systems=[
                {
                    "name": "Frankfurt S3 Logs",
                    "type": "s3",
                    "description": "Central backup repository",
                    "region": "eu-central-1",
                    "cross_border": False,
                }
            ],
        )
    )
    assert output.status == "succeeded"
    result = DrishtiOutput.model_validate(output.output)
    assert result.cross_border_systems == 1
    assert result.escalate is True
    assert result.inventory[0].region == "eu-central-1"
    assert result.inventory[0].cross_border is True
    assert any("DPDPA-XBD-01" in w for w in result.warnings)


@pytest.mark.asyncio
async def test_drishti_recognizes_indian_regions_as_domestic():
    output = await DrishtiAgent().invoke(
        DrishtiInput(
            tenant_id="t1",
            engagement_id="e1",
            systems=[
                {
                    "name": "Hyderabad DB",
                    "type": "postgres",
                    "region": "ap-south-2",
                    "cross_border": False,
                },
                {
                    "name": "Delhi GCP Storage",
                    "type": "gcs",
                    "region": "asia-south2",
                    "cross_border": False,
                },
                {
                    "name": "Pune Azure Lake",
                    "type": "azure_blob",
                    "region": "centralindia",
                    "cross_border": False,
                },
            ],
        )
    )
    assert output.status == "succeeded"
    result = DrishtiOutput.model_validate(output.output)
    assert result.cross_border_systems == 0
    assert result.escalate is False
    assert len(result.warnings) == 0
