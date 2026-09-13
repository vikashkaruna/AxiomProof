import { GenericModuleView, type ModuleTelemetryEvent } from '../generic-module-view';
import { createSupabaseAdmin } from '@axiom/supabase';

export const dynamic = 'force-dynamic';

export default async function ExecutionPage() {
  const admin = createSupabaseAdmin();
  let plans: any[] = [];
  let actions: any[] = [];
  let executionLedger: any[] = [];

  try {
    const [plansRes, actionsRes, ledgerRes] = await Promise.all([
      admin
        .from('remediation_plans')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
      admin
        .from('remediation_actions')
        .select('id, plan_id, risk_tier, dry_run_status, rollback_validated, rollback_ref')
        .limit(10),
      admin
        .from('audit_ledger')
        .select('seq, correlation_id, action, target_ref, timestamp, entry_hash, result')
        .or('actor.eq.karya,action.ilike.%execute%,action.ilike.%mutation%')
        .order('seq', { ascending: false })
        .limit(6),
    ]);

    plans = plansRes.data || [];
    actions = actionsRes.data || [];
    executionLedger = ledgerRes.data || [];
  } catch {
    // Graceful fallback
  }

  const telemetryEvents: ModuleTelemetryEvent[] = executionLedger.map((r) => ({
    seq: r.seq,
    title: r.action || 'Remediation Mutation Executed',
    detail: `Target: ${r.target_ref || 'Production Infrastructure'} · Corr: ${r.correlation_id?.slice(0, 8)}…`,
    time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString('en-IN') : 'Recently',
    target: r.target_ref || 'prod_system',
    hash: r.entry_hash,
    status: r.result === 'success' ? '✓ verified' : r.result,
  }));

  const verifiedActions = actions.filter((a) => a.rollback_validated).length;

  return (
    <GenericModuleView
      meta={{
        title: 'Execution & Rollback',
        hi: 'निष्पादन',
        phase: 'P3',
        agent: 'Karya',
        agentKey: 'karya',
        autonomy: 'L2 (token-gated)',
        moduleId: 'M3.4',
        statutoryCitation: 'ADR-1, ADR-2 & BR-2',
        desc: 'Karya executes only approved actions — batch with configurable concurrency and stop-on-failure, or individually. Pre/post state captured per action; blast-radius caps and kill switch enforced.',
        actionLabel: 'Review & Approve Actions in Console →',
        actionHref: '/approval',
        cards: [
          {
            h: 'Recent executions',
            rows: [
              {
                t: 'Batch RB-118 · 7 actions',
                v: '✓ verified',
                dot: '#0FB5A5',
              },
              {
                t: 'ACT-09 rollback exercised',
                v: '✓ reversed',
                dot: '#0FB5A5',
              },
              {
                t: 'ACT-14 halted — blast cap',
                v: 'escalated',
                dot: '#D9534F',
              },
            ],
          },
          {
            h: 'Guardrails',
            rows: [
              {
                t: 'Blast-radius cap / batch',
                v: '5,000 rec',
                dot: '#1E2A4A',
              },
              {
                t: 'Concurrency',
                v: '4',
                dot: '#1E2A4A',
              },
              {
                t: 'Kill switch',
                v: 'armed',
                dot: '#0FB5A5',
              },
            ],
          },
        ],
        recentEvents: telemetryEvents,
        telemetryTitle: 'Recent Executions & Rollbacks in Audit Ledger',
      }}
    />
  );
}
