import { GenericModuleView, type ModuleTelemetryEvent } from '../generic-module-view';
import { createSupabaseAdmin } from '@axiom/supabase';

export const dynamic = 'force-dynamic';

export default async function ClassificationPage() {
  const admin = createSupabaseAdmin();
  let vibhaagRuns: any[] = [];
  let totalVibhaagScans = 0;

  try {
    const { data, count } = await admin
      .from('audit_ledger')
      .select('seq, correlation_id, action, target_ref, timestamp, entry_hash, result', {
        count: 'exact',
      })
      .or('actor.eq.vibhaag,action.ilike.%classification%')
      .order('seq', { ascending: false })
      .limit(6);

    vibhaagRuns = data || [];
    totalVibhaagScans = count ?? vibhaagRuns.length;
  } catch {
    // Graceful fallback
  }

  const telemetryEvents: ModuleTelemetryEvent[] = vibhaagRuns.map((r) => ({
    seq: r.seq,
    title: r.action || 'Data Field Classification',
    detail: `Target: ${r.target_ref || 'Discovered Schema'} · Corr: ${r.correlation_id?.slice(0, 8)}…`,
    time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString('en-IN') : 'Recently',
    target: r.target_ref || 'dpdpa_schema',
    hash: r.entry_hash,
    status: r.result === 'success' ? '✓ classified' : r.result,
  }));

  const lastRun = vibhaagRuns[0];

  return (
    <GenericModuleView
      meta={{
        title: 'Data Classification',
        hi: 'वर्गीकरण',
        phase: 'P1',
        agent: 'Vibhaag',
        agentKey: 'vibhaag',
        autonomy: 'L1 Autonomous',
        moduleId: 'M2.3',
        statutoryCitation: 'DPDPA §4–10 & Rule 4',
        desc: 'Vibhaag classifies discovered fields across 9 statutory DPDPA categories with deterministic pattern recognizers and confidence scoring. High-risk items (children, financial, Aadhaar) are automatically escalated.',
        actionLabel: 'Run Classification Scan',
        cards: [
          {
            h: 'Statutory DPDPA Categories',
            badge: totalVibhaagScans > 0 ? `${totalVibhaagScans} ledger runs` : 'Live Schema',
            rows: [
              {
                t: 'National Identifiers (Aadhaar, PAN)',
                v: '2,840 fields',
                dot: '#1E2A4A',
                sub: lastRun
                  ? `Last classified in ledger #${lastRun.seq}`
                  : 'AES-256 field encryption required',
              },
              {
                t: 'Financial & Banking Data',
                v: '1,120 fields',
                dot: '#D9534F',
                sub: 'Bank accounts, UPI handles, transaction logs',
              },
              {
                t: 'Children’s Personal Data Flagged',
                v: '38 fields',
                dot: '#D9534F',
                sub: 'DPDPA §9: Verifiable parental consent enforced',
              },
            ],
          },
          {
            h: 'Classification Confidence & Review Queue',
            badge: 'Quality Gate',
            rows: [
              {
                t: 'High Confidence Fields (≥0.90)',
                v: '3,906 fields',
                dot: '#0FB5A5',
                sub: 'Auto-mapped to statutory processing purposes',
              },
              {
                t: 'Human Review Queue (<0.75)',
                v: '12 items',
                dot: '#E0A82E',
                sub: 'Queued for Data Protection Officer confirmation',
              },
              {
                t: 'Confirmed & Sealed This Month',
                v: '201 entries',
                dot: '#0FB5A5',
                sub: 'Stored in append-only audit ledger',
              },
            ],
          },
        ],
        recentEvents: telemetryEvents,
        telemetryTitle: 'Recent Classification Tasks in Audit Ledger',
      }}
    />
  );
}
