"""Tests for agent runtime Settings resolution with AXIOM_* variables."""

import os
from unittest.mock import patch
from axiom.config import Settings


def test_settings_resolves_axiom_variables():
    env = {
        "AXIOM_REGION": "asia-south1",
        "AXIOM_EVIDENCE_BUCKET": "axiom-preprod-bucket",
        "AXIOM_STORAGE_ENDPOINT": "https://storage.googleapis.com",
        "AXIOM_STORAGE_ACCESS_KEY_ID": "GOOG123ACCESS",
        "AXIOM_STORAGE_SECRET_ACCESS_KEY": "gcssecret123",
        "AXIOM_PROJECT_ID": "axiom-proof",
        "AXIOM_PROJECT_NUMBER": "188516662106",
    }
    with patch.dict(os.environ, env, clear=False):
        settings = Settings()
        assert settings.axiom_region == "asia-south1"
        assert settings.aws_region == "asia-south1"
        assert settings.axiom_evidence_bucket == "axiom-preprod-bucket"
        assert settings.s3_evidence_bucket == "axiom-preprod-bucket"
        assert settings.axiom_storage_endpoint == "https://storage.googleapis.com"
        assert settings.s3_endpoint == "https://storage.googleapis.com"
        assert settings.axiom_storage_access_key_id == "GOOG123ACCESS"
        assert settings.aws_access_key_id == "GOOG123ACCESS"
        assert settings.axiom_storage_secret_access_key == "gcssecret123"
        assert settings.aws_secret_access_key == "gcssecret123"
        assert settings.axiom_project_id == "axiom-proof"
        assert settings.axiom_project_number == "188516662106"


def test_settings_falls_back_to_legacy_aws_and_gcp_variables():
    env = {
        "AWS_REGION": "ap-south-1",
        "S3_EVIDENCE_BUCKET": "legacy-s3-bucket",
        "S3_ENDPOINT": "http://minio:9000",
        "AWS_ACCESS_KEY_ID": "LEGACY_KEY",
        "AWS_SECRET_ACCESS_KEY": "LEGACY_SECRET",
        "GCP_PROJECT_ID": "legacy-project",
    }
    remove_keys = [
        "AXIOM_REGION",
        "AXIOM_EVIDENCE_BUCKET",
        "AXIOM_STORAGE_ENDPOINT",
        "AXIOM_STORAGE_ACCESS_KEY_ID",
        "AXIOM_STORAGE_SECRET_ACCESS_KEY",
        "AXIOM_PROJECT_ID",
    ]
    with patch.dict(os.environ, env, clear=False):
        for k in remove_keys:
            os.environ.pop(k, None)
        settings = Settings()
        assert settings.axiom_region == "ap-south-1"
        assert settings.axiom_evidence_bucket == "legacy-s3-bucket"
        assert settings.axiom_storage_endpoint == "http://minio:9000"
        assert settings.axiom_storage_access_key_id == "LEGACY_KEY"
        assert settings.axiom_storage_secret_access_key == "LEGACY_SECRET"
        assert settings.axiom_project_id == "legacy-project"
