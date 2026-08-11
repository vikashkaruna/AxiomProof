"""Tests for the model router decision logic."""

from model_gateway.config import Settings
from model_gateway.router import decide_route


def test_structural_routes_to_self_hosted():
    s = Settings(
        aws_region="ap-south-1",
        bedrock_model="anthropic.claude-3-5-sonnet",
        self_hosted_model="Qwen/Qwen2.5-32B-Instruct-AWQ",
    )
    d = decide_route("structural", "", s)
    assert d.provider == "self_hosted"
    assert "Qwen" in d.model


def test_reasoning_routes_to_bedrock():
    s = Settings(
        aws_region="ap-south-1",
        bedrock_model="anthropic.claude-3-5-sonnet",
        self_hosted_model="Qwen/Qwen2.5-32B-Instruct-AWQ",
    )
    d = decide_route("reasoning", "", s)
    assert d.provider == "bedrock"
    assert "claude" in d.model


def test_explicit_claude_request_honoured():
    s = Settings(
        aws_region="ap-south-1",
        bedrock_model="anthropic.claude-3-5-sonnet",
        self_hosted_model="Qwen/Qwen2.5-32B-Instruct-AWQ",
    )
    d = decide_route("structural", "anthropic.claude-3-haiku", s)
    assert d.provider == "bedrock"


def test_explicit_qwen_request_honoured():
    s = Settings(
        aws_region="ap-south-1",
        bedrock_model="anthropic.claude-3-5-sonnet",
        self_hosted_model="Qwen/Qwen2.5-32B-Instruct-AWQ",
    )
    d = decide_route("reasoning", "Qwen/Qwen2.5-72B", s)
    assert d.provider == "self_hosted"
    assert "Qwen" in d.model
