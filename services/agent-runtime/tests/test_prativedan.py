from axiom.agents.prativedan import PrativedanAgent


def test_prativedan_extracts_only_explicit_evidence_ids():
    ids = PrativedanAgent._evidence_ids(
        [
            {"evidence_required": [{"type": "document", "description": "Policy"}]},
            {"evidence_ids": ["ev-1"], "evidence_required": [{"evidence_id": "ev-2"}]},
        ]
    )
    assert ids == ["ev-1", "ev-2"]


def test_prativedan_html_escapes_untrusted_report_values():
    html = PrativedanAgent._render_html(
        object.__new__(PrativedanAgent),
        "<script>alert(1)</script>",
        [
            {
                "type": "findings_table",
                "title": "<img src=x>",
                "items": [{"control_id": "<x>", "title": "<b>bad</b>"}],
            }
        ],
        10,
        "Critical",
    )
    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "&lt;img" in html
