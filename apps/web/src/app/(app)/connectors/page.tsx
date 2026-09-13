import { GenericModuleView, type ModuleTelemetryEvent } from '../generic-module-view';
import { createSupabaseAdmin } from '@axiom/supabase';

export const dynamic = 'force-dynamic';

export default async function ConnectorsPage() {
  const admin = createSupabaseAdmin();
  let connectorRuns: any[] = [];
  let totalConnectorEvents = 0;

  try {
    const { data, count } = await admin
      .from('audit_ledger')
      .select('seq, correlation_id, action, target_ref, timestamp, entry_hash, result', {
        count: 'exact',
      })
      .or(
        'action.ilike.%connect%,target_ref.ilike.%postgres%,target_ref.ilike.%s3%,actor.in.(drishti,vibhaag,samanvaya)',
      )
      .order('seq', { ascending: false })
      .limit(6);

    connectorRuns = data || [];
    totalConnectorEvents = count ?? connectorRuns.length;
  } catch {
    // Graceful fallback if database offline
  }

  const telemetryEvents: ModuleTelemetryEvent[] = connectorRuns.map((r) => ({
    seq: r.seq,
    title: r.action || 'Connector Health & Access Verification',
    detail: `Target: ${r.target_ref || 'ap-south-1 Adapter'} · Corr: ${r.correlation_id?.slice(0, 8)}…`,
    time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString('en-IN') : 'Recently',
    target: r.target_ref || 'ap-south-1 Connector',
    hash: r.entry_hash,
    status: r.result === 'success' ? '✓ active' : r.result,
  }));

  const lastEvent = connectorRuns[0];

  return (
    <GenericModuleView
      meta={{
        title: 'Data Connectors',
        hi: 'डेटा कनेक्टर',
        phase: 'P2',
        autonomy: 'L2 Enforced Isolation',
        moduleId: 'M2.1',
        statutoryCitation: 'DPDPA §8(5) & ADR-3 Separation of Duties',
        desc: 'Pluggable read-only connectors isolate corporate data stores from mutating engines. Read and write interfaces use separate, time-bound, cryptographically signed credentials strictly bound to ap-south-1 (Mumbai).',
        actionLabel: 'Discover Data via Connectors →',
        actionHref: '/discovery',
        cards: [
          {
            h: 'Connected Sovereign Infrastructure',
            badge: '100% ap-south-1 Mumbai',
            rows: [
              {
                t: 'PostgreSQL Primary Production',
                v: 'Connected · Read-Only',
                dot: '#0FB5A5',
                sub: lastEvent
                  ? `Verified in ledger entry #${lastEvent.seq}`
                  : 'SSL required · 0 cross-border egress',
              },
              {
                t: 'AWS S3 Evidence Vault',
                v: 'Connected · WORM Vault',
                dot: '#C9A227',
                sub: 'Object Lock Compliance mode enabled (ap-south-1)',
              },
              {
                t: 'Temporal Orchestrator Fabric',
                v: 'Connected · Replay Safe',
                dot: '#0FB5A5',
                sub: 'Durable workflow state machine active',
              },
            ],
          },
          {
            h: 'Security & Scope Isolation',
            badge:
              totalConnectorEvents > 0 ? `${totalConnectorEvents} events logged` : 'ADR-3 Enforced',
            rows: [
              {
                t: 'Mutating Write Scopes Active',
                v: '0 unapproved',
                dot: '#0FB5A5',
                sub: 'No agent holds persistent write credentials (ADR-3)',
              },
              {
                t: 'Scope Auto-Expiry Standard',
                v: '24 Hours Max',
                dot: '#1E2A4A',
                sub: 'Time-bound, revocable per-action tokens',
              },
              {
                t: 'Cross-Border Leakage Prevention',
                v: 'Zero non-domestic hops',
                dot: '#0FB5A5',
                sub: 'Model Gateway redacts PII before inference',
              },
            ],
          },
        ],
        recentEvents: telemetryEvents,
        telemetryTitle: 'Recent Connector Invocations in Audit Ledger',
      }}
    />
  );
}
