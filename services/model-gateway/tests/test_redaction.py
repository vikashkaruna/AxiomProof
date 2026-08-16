"""Tests for the Model Gateway redaction logic."""

from model_gateway.redaction import redact, redact_variables


def test_redacts_pan():
    r = redact("Customer PAN is ABCDE1234F")
    assert "ABCDE1234F" not in r.redacted_text
    assert r.redactions.get("PAN") == 1


def test_redacts_aadhaar_with_spaces():
    r = redact("Aadhaar: 1234 5678 9012")
    assert "1234 5678 9012" not in r.redacted_text
    assert "REDACTED:AADHAAR" in r.redacted_text


def test_redacts_aadhaar_no_spaces():
    r = redact("aadhaar=123456789012")
    assert "123456789012" not in r.redacted_text


def test_redacts_email():
    r = redact("Email vikash@axiomminds.ai for details")
    assert "vikash@axiomminds.ai" not in r.redacted_text


def test_redacts_upi_id():
    r = redact("Pay to vikash@ybl")
    assert "vikash@ybl" not in r.redacted_text
    assert r.redactions.get("UPI") == 1


def test_redacts_indian_phone():
    r = redact("Phone: +91 98765 43210")
    assert "98765 43210" not in r.redacted_text


def test_redacts_ip_address():
    r = redact("Server: 10.0.1.5 logged in")
    assert "10.0.1.5" not in r.redacted_text


def test_passes_through_clean():
    r = redact("Hello world")
    assert r.redacted_text == "Hello world"
    assert r.redactions == {}


def test_redact_variables_recursive():
    variables = {
        "customer": {
            "name": "Vikash",
            "pan": "ABCDE1234F",
        },
        "notes": ["Call 98765 43210", "clean note"],
    }
    out, log = redact_variables(variables)
    assert "ABCDE1234F" not in str(out)
    assert "98765 43210" not in str(out)
    assert log.get("PAN") == 1
    assert log.get("PHONE_IN") == 1


def test_redaction_summary_hashes():
    r = redact("Some text with PAN ABCDE1234F")
    assert r.original_hash != r.redacted_hash
    # Hashes are 64 chars (SHA-256 hex)
    assert len(r.original_hash) == 64
    assert len(r.redacted_hash) == 64
