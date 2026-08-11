"""Evidence Vault — S3 client with Object Lock (WORM) Compliance mode.

Mirrors packages/evidence/src/index.ts. Used by Saakshi (the evidence
agent) and by any agent that needs to capture audit artifacts.

The evidence vault is the product's trust claim. Per Doc 04 §6.2 and
Doc 05 §5, this is plain S3 API (no AWS-proprietary conveniences) so
the bucket can move to MinIO or GCS-interop without a rewrite.

Object Lock with Compliance mode retention means:
  - Object cannot be deleted by ANY user, including root, until
    retention period expires
  - Object cannot be overwritten
  - Retention period itself cannot be shortened
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import boto3
from botocore.client import Config

from .config import Settings, get_settings


@dataclass(frozen=True)
class SealedEvidence:
    content_hash: str
    storage_uri: str
    bucket: str
    key: str
    byte_size: int
    retain_until: datetime
    lock_mode: Literal["COMPLIANCE", "GOVERNANCE"] = "COMPLIANCE"
    version_id: str | None = None
    encryption: str = "AES256"


@dataclass(frozen=True)
class SealInput:
    bucket: str
    key: str
    body: bytes
    content_type: str
    retention_days: int
    tenant_id: str
    engagement_id: str | None = None
    collected_by_agent: str = ""
    legal_hold: bool = False
    encryption: str = "AES256"
    metadata: dict[str, str] | None = None


class EvidenceVault:
    def __init__(self, settings: Settings | None = None):
        s = settings or get_settings()
        self._settings = s
        kwargs: dict[str, Any] = {
            "region_name": s.aws_region,
            "config": Config(signature_version="s3v4"),
        }
        if s.aws_access_key_id and s.aws_secret_access_key:
            kwargs["aws_access_key_id"] = s.aws_access_key_id
            kwargs["aws_secret_access_key"] = s.aws_secret_access_key
        if s.s3_endpoint:
            kwargs["endpoint_url"] = s.s3_endpoint
        self._s3 = boto3.client("s3", **kwargs)

    def seal(self, input: SealInput) -> SealedEvidence:
        body = input.body
        content_hash = hashlib.sha256(body).hexdigest()
        retain_until = datetime.now(timezone.utc) + timedelta(days=input.retention_days)

        metadata = {
            "axiom-content-sha256": content_hash,
            "axiom-tenant-id": input.tenant_id,
            "axiom-engagement-id": input.engagement_id or "",
            "axiom-collected-by-agent": input.collected_by_agent,
            "axiom-sealed-at": datetime.now(timezone.utc).isoformat(),
        }
        if input.metadata:
            metadata.update(input.metadata)

        put_kwargs: dict[str, Any] = {
            "Bucket": input.bucket,
            "Key": input.key,
            "Body": body,
            "ContentType": input.content_type,
            "ContentMD5": _md5_b64(body),
            "Metadata": metadata,
            "ObjectLockMode": "COMPLIANCE",
            "ObjectLockRetainUntilDate": retain_until,
            "ObjectLockLegalHoldStatus": "ON" if input.legal_hold else "OFF",
            "ServerSideEncryption": input.encryption,
            "ChecksumAlgorithm": "SHA256",
        }
        result = self._s3.put_object(**put_kwargs)
        return SealedEvidence(
            content_hash=content_hash,
            storage_uri=f"s3://{input.bucket}/{input.key}",
            bucket=input.bucket,
            key=input.key,
            byte_size=len(body),
            retain_until=retain_until,
            version_id=result.get("VersionId"),
        )

    def verify_integrity(
        self, bucket: str, key: str, expected_hash: str
    ) -> tuple[bool, str]:
        obj = self._s3.get_object(Bucket=bucket, Key=key)
        body = obj["Body"].read()
        actual = hashlib.sha256(body).hexdigest()
        return actual == expected_hash, actual


def content_key(
    *,
    tenant_id: str,
    content_hash: str,
    filename: str | None = None,
    engagement_id: str | None = None,
) -> str:
    if engagement_id:
        path = (
            f"tenants/{tenant_id}/engagements/{engagement_id}"
            f"/evidence/{content_hash}"
        )
    else:
        path = f"tenants/{tenant_id}/evidence/{content_hash}"
    return f"{path}/{filename}" if filename else path


def _md5_b64(data: bytes) -> str:
    import base64

    return base64.b64encode(hashlib.md5(data).digest()).decode("ascii")
