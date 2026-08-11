"""Configuration for the Model Gateway."""

from __future__ import annotations

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "axiom-model-gateway"
    environment: Literal["development", "staging", "production", "test"] = "development"
    http_host: str = "0.0.0.0"
    http_port: int = 8001
    log_level: Literal["debug", "info", "warn", "error"] = "info"

    # Auth
    api_key: str | None = None

    # Provider configuration
    # Self-hosted vLLM (open-weight model on EKS GPU node group)
    self_hosted_base_url: str | None = None
    self_hosted_model: str = "Qwen/Qwen2.5-32B-Instruct-AWQ"
    # AWS Bedrock (Claude) — for high-stakes reasoning
    aws_region: str = "ap-south-1"
    bedrock_model: str = "anthropic.claude-3-5-sonnet-20240620-v1:0"
    fallback_model: str = "anthropic.claude-3-haiku-20240307-v1:0"

    # PII redaction
    pii_redaction_enabled: bool = True
    pii_min_confidence: float = 0.6

    # Cache
    cache_backend: Literal["memory", "redis"] = "memory"
    cache_ttl_seconds: int = 3600
    redis_url: str | None = None

    # Cost tracking
    cost_per_input_token: dict[str, float] = Field(
        default_factory=lambda: {
            "anthropic.claude-3-5-sonnet-20240620-v1:0": 0.000003,
            "anthropic.claude-3-haiku-20240307-v1:0": 0.00000025,
            "Qwen/Qwen2.5-32B-Instruct-AWQ": 0.0,
        }
    )
    cost_per_output_token: dict[str, float] = Field(
        default_factory=lambda: {
            "anthropic.claude-3-5-sonnet-20240620-v1:0": 0.000015,
            "anthropic.claude-3-haiku-20240307-v1:0": 0.00000125,
            "Qwen/Qwen2.5-32B-Instruct-AWQ": 0.0,
        }
    )

    # Observability
    otel_exporter_otlp_endpoint: str | None = None


def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
