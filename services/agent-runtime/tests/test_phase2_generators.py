from axiom.playbook import PlaybookEntry, rank_playbook_backlog
from axiom.policy_generator import build_privacy_notice, build_retention_policy
from axiom.ropa_generator import build_ropa_records


def test_ropa_keeps_unknown_legal_facts_for_human_review():
    output = build_ropa_records(
        [
            {
                "name": "CRM",
                "description": "Customer support and account management",
                "data_categories": ["contact"],
                "processor": "Acme Cloud",
                "cross_border": True,
                "evidence_refs": ["ev-1"],
            }
        ],
        [{"system": "CRM", "field_path": "CRM.email", "category": "contact"}],
    )
    record = output.records[0]
    assert record.data_items == ["email"]
    assert record.lawful_basis.startswith("To be confirmed")
    assert record.transfer_safeguards == "To be documented"
    assert record.review_required is True


def test_policy_drafts_reference_ropa_activities():
    records = build_ropa_records([{"name": "Billing", "description": "Invoices"}]).records
    notice = build_privacy_notice("Example Ltd", records)
    retention = build_retention_policy("Example Ltd", records)
    assert notice.kind == "privacy_notice"
    assert retention.kind == "retention_policy"
    assert notice.source_activity_ids == retention.source_activity_ids
    assert notice.legal_review_required is True


def test_playbook_backlog_ranks_repeated_time_cost():
    entries = [
        PlaybookEntry(task_name="Small", source="e1", duration_minutes=30, repetitions=2),
        PlaybookEntry(task_name="Large", source="e1", duration_minutes=10, repetitions=10),
    ]
    assert [entry.task_name for entry in rank_playbook_backlog(entries)] == ["Large", "Small"]
