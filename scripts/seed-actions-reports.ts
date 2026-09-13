import { createSupabaseAdmin } from '@axiom/supabase';

const admin = createSupabaseAdmin();

async function main() {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const libVersion = '0.1.0';

  const { data: plans } = await admin
    .from('remediation_plans')
    .select('id, engagement_id')
    .eq('tenant_id', tenantId)
    .limit(1);

  if (plans && plans.length > 0) {
    const planId = plans[0].id;
    const engagementId = plans[0].engagement_id;

    // Seed Actions
    const { count: actCount } = await admin
      .from('remediation_actions')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', planId);

    if (!actCount || actCount === 0) {
      const actions = [
        {
          tenant_id: tenantId,
          plan_id: planId,
          sequence: 1,
          action_type: 'data.retention_purge',
          risk_class: 'medium',
          risk_score: 45.0,
          approval_status: 'awaiting_approval',
          dry_run_status: 'dry_run_complete',
          rollback_validated: true,
          description:
            'Purge soft-deleted user records exceeding statutory 180-day retention window in analytics-lake',
          blast_radius: { rows: 14200, table: 'user_events_archive' },
          dry_run_result: {
            rows_affected: 14200,
            execution_simulated_at: new Date().toISOString(),
            status: 'validated_clean',
            safety_checks_passed: true,
          },
          rollback_definition: {
            strategy: 'point_in_time_snapshot_restore',
            snapshot_ref: 'snap-db-mumbai-20260913-0400',
            estimated_rollback_seconds: 45,
          },
        },
        {
          tenant_id: tenantId,
          plan_id: planId,
          sequence: 2,
          action_type: 'notice.update',
          risk_class: 'low',
          risk_score: 15.0,
          approval_status: 'awaiting_approval',
          dry_run_status: 'dry_run_complete',
          rollback_validated: true,
          description:
            'Deploy version 2.4 bilingual consent notice (English + Hindi) to production registration gateways',
          blast_radius: { configs: 1, endpoints: 4 },
          dry_run_result: {
            validation: 'schema_and_translation_verified',
            languages_supported: ['en', 'hi'],
            safety_checks_passed: true,
          },
          rollback_definition: {
            strategy: 'revert_git_commit_and_config',
            previous_version: '2.3.1',
          },
        },
        {
          tenant_id: tenantId,
          plan_id: planId,
          sequence: 3,
          action_type: 'config.rbac_update',
          risk_class: 'low',
          risk_score: 20.0,
          approval_status: 'awaiting_approval',
          dry_run_status: 'dry_run_complete',
          rollback_validated: true,
          description:
            'Enforce dynamic column-level masking on Aadhaar & PAN columns for non-privileged read roles',
          blast_radius: { roles: 3, columns: 2 },
          dry_run_result: {
            masked_columns: ['aadhaar_num', 'pan_num'],
            policy_enforced: true,
            safety_checks_passed: true,
          },
          rollback_definition: {
            strategy: 'drop_masking_policy',
            policy_name: 'pol_mask_pii_replica',
          },
        },
        {
          tenant_id: tenantId,
          plan_id: planId,
          sequence: 4,
          action_type: 'data.mask',
          risk_class: 'low',
          risk_score: 10.0,
          approval_status: 'awaiting_approval',
          dry_run_status: 'dry_run_complete',
          rollback_validated: true,
          description:
            'Mask orphaned contact numbers in unindexed application telemetry older than 90 days',
          blast_radius: { rows: 27062, index: 'app-logs-2026' },
          dry_run_result: {
            lines_scanned: 27062,
            matches_redacted: 1840,
            safety_checks_passed: true,
          },
          rollback_definition: {
            strategy: 'restore_log_segment',
            backup_location: 's3://axiom-backups-ap-south-1/logs/pre-mask/',
          },
        },
      ];

      const { error: aErr } = await admin.from('remediation_actions').insert(actions);
      if (aErr) console.error('Actions insert error:', aErr);
      else console.log(`✓ Seeded ${actions.length} remediation actions into DB`);
    } else {
      console.log(`✓ Actions already present (${actCount})`);
    }

    // Seed Reports
    const { count: repCount } = await admin
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (!repCount || repCount === 0) {
      const reports = [
        {
          tenant_id: tenantId,
          engagement_id: engagementId,
          kind: 'board',
          title: 'Executive Board DPDPA Compliance Briefing — Q3 2026',
          storage_uri: 's3://axiom-reports-ap-south-1/meridian/board-briefing-q3.pdf',
          library_version: libVersion,
          generated_by_agent: 'prativedan',
          status: 'published',
          content: {
            score: 74,
            open_gaps: 6,
            controls_passing: 32,
            exposure: '₹18–46 cr',
            narrative: 'Executive board compliance summary under DPDP Act 2023.',
          },
        },
        {
          tenant_id: tenantId,
          engagement_id: engagementId,
          kind: 'auditor',
          title: 'Statutory DPB Auditor Evidence & Cryptographic Proof Pack',
          storage_uri: 's3://axiom-reports-ap-south-1/meridian/dpb-auditor-pack.pdf',
          library_version: libVersion,
          generated_by_agent: 'prativedan',
          status: 'published',
          content: {
            sealed_artifacts: 5,
            ledger_entries: 142,
            integrity_verified: true,
          },
        },
        {
          tenant_id: tenantId,
          engagement_id: engagementId,
          kind: 'technical',
          title: 'Technical Safeguards & Architectural Isolation Audit Report',
          storage_uri: 's3://axiom-reports-ap-south-1/meridian/technical-safeguards.pdf',
          library_version: libVersion,
          generated_by_agent: 'prativedan',
          status: 'published',
          content: {
            databases_scanned: 4,
            buckets_audited: 8,
            encryption_at_rest: '100% AES-256-GCM',
          },
        },
      ];

      const { error: rErr } = await admin.from('reports').insert(reports);
      if (rErr) console.error('Reports insert error:', rErr);
      else console.log(`✓ Seeded ${reports.length} reports into DB`);
    } else {
      console.log(`✓ Reports already present (${repCount})`);
    }
  }
}

main().catch(console.error);
