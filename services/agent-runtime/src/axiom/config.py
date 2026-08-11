"""Runtime configuration. Loaded once at process start and frozen."""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Axiom Proof agent runtime settings.

    All settings are loaded from environment variables. Required
    values fail-fast at boot.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── Service identity ───────────────────────────────────────────
    service_name: str = "axiom-agent-runtime"
    environment: Literal["development", "staging", "production", "test"] = "development"
    log_level: Literal["debug", "info", "warn", "error"] = "info"
    http_port: int = 8000
    http_host: str = "0.0.0.0"

    # ─── Supabase ──────────────────────────────────────────────────
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_service_key: str = Field(..., description="Supabase service-role key (server-side only)")
    supabase_db_url: str | None = None

    # ─── AWS / S3 ───────────────────────────────────────────────────
    aws_region: str = "ap-south-1"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    s3_evidence_bucket: str = "axiom-proof-evidence"
    s3_endpoint: str | None = None  # for MinIO / R2 in dev

    # ─── Model Gateway ─────────────────────────────────────────────
    # Internal: the gateway is self-hosted on the same EKS cluster.
    model_gateway_url: str = "http://model-gateway.axiom-proof:8000"
    model_gateway_api_key: str | None = None
    # The default model for high-stakes reasoning. Self-hosted for
    # structural-only tasks (see control-library-loader / structural flag).
    default_model: str = "anthropic.claude-3-5-sonnet@20240620"
    fallback_model: str = "anthropic.claude-3-haiku@20240307"

    # ─── Temporal ──────────────────────────────────────────────────
    temporal_address: str = "ap-south-1.aws.api.temporal.io:7233"
    temporal_namespace: str = "axiom-proof"
    temporal_api_key: str | None = None
    temporal_tls: bool = True

    # ─── Approval token signing (mirror of BFF, used in workers) ──
    approval_signing_key: str | None = None

    # ─── Internal token for BFF → agent-runtime calls ────────────
    internal_token: str | None = None

    # ─── Feature flags ─────────────────────────────────────────────
    feature_dry_run_engine: bool = True
    feature_execution_engine: bool = True
    feature_live_connectors: bool = False
    feature_kill_switch: bool = True

    # ─── Observability ─────────────────────────────────────────────
    otel_exporter_otlp_endpoint: str | None = None
    sentry_dsn: str | None = None


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor. The same instance is returned for the
    lifetime of the process — no per-request env reads.
    """
    return Settings()  # type: ignore[call-arg]


def setup_logging(settings: Settings) -> None:
    """Configure structlog + stdlib logging for JSON output."""
    import structlog

    level = getattr(logging, settings.log_level.upper())
    logging.basicConfig(level=level, format="%(message)s")

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
