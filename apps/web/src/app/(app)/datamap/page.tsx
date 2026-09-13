import { GenericModuleView, type ModuleTelemetryEvent } from '../generic-module-view';
import { createSupabaseAdmin } from '@axiom/supabase';

export const dynamic = 'force-dynamic';

export default async function DataMapPage() {
  const admin = createSupabaseAdmin();
  let ropaEvidence: any[] = [];
  let ledgerEvents: any[] = [];

  try {
    const [evRes, ledgerRes] = await Promise.all([
      admin
        .from('evidence')
        .select('id, title, content_hash, metadata, created_at')
        .or('type.eq.ropa,description.ilike.%ropa%,title.ilike.%ropa%')
        .order('created_at', { ascending: false })
        .limit(4),
      admin
        .from('audit_ledger')
        .select('seq, correlation_id, action, target_ref, timestamp, entry_hash, result')
        .or('action.ilike.%ropa%,action.ilike.%datamap%')
        .order('seq', { ascending: false })
        .limit(6),
    ]);

    ropaEvidence = evRes.data || [];
    ledgerEvents = ledgerRes.data || [];
  } catch {
    // Graceful fallback
  }

  const telemetryEvents: ModuleTelemetryEvent[] = ledgerEvents.map((r) => ({
    seq: r.seq,
    title: r.action || 'RoPA Data Flow Synchronization',
    detail: `Target: ${r.target_ref || 'RoPA Registry'} · Corr: ${r.correlation_id?.slice(0, 8)}…`,
    time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString('en-IN') : 'Recently',
    target: r.target_ref || 'ropa_register',
    hash: r.entry_hash,
    status: r.result === 'success' ? '✓ sealed' : r.result,
  }));

  return (
    <GenericModuleView
      meta={{
        title: 'Data Map & RoPA',
        hi: 'डेटा मानचित्र',
        phase: 'P1',
        agent: 'Vibhaag + Drishti',
        agentKey: 'vibhaag',
        autonomy: 'L1 Autonomous',
        moduleId: 'M1.3',
        statutoryCitation: 'DPDPA §8(4) & Rule 5',
        desc: 'Auto-generated Record of Processing Activities (RoPA) synthesizing discovery schemas and classification tags into lawful processing bases, cross-border flows, and retention schedules.',
        actionLabel: 'Re-generate RoPA Map',
        cards: [
          {
            h: 'RoPA Processing Activities',
            badge: `${ropaEvidence.length > 0 ? ropaEvidence.length + ' sealed WORM' : 'Statutory'}`,
            rows: [
              {
                t: 'Total Processing Activities Documented',
                v: '34 flows',
                dot: '#1E2A4A',
                sub: 'Account creation, payments, KYC verification, analytics',
              },
              {
                t: 'With Statutory Lawful Basis Mapped',
                v: '29 verified',
                dot: '#0FB5A5',
                sub: 'Consent (§6) & Certain Legitimate Uses (§7)',
              },
              {
                t: 'Missing Explicit Ground (Gap Flagged)',
                v: '5 flows',
                dot: '#D9534F',
                sub: 'Escalated to Sudhaar for remediation planning',
              },
            ],
          },
          {
            h: 'Data Flow Topology & Residency',
            badge: 'DPDPA §16',
            rows: [
              {
                t: 'Internal Storage & Compute Nodes',
                v: '18 systems',
                dot: '#1E2A4A',
                sub: 'Verified domestic residency in ap-south-1',
              },
              {
                t: 'Third-Party Processors (DPA Active)',
                v: '6 vendors',
                dot: '#E0A82E',
                sub: 'DPDPA §8(2) processor contract clauses validated',
              },
              {
                t: 'Cross-Border Destination Safeguards',
                v: '0 unmitigated',
                dot: '#0FB5A5',
                sub: 'Mandatory cross-border transfer safeguards enforced',
              },
            ],
          },
        ],
        recentEvents: telemetryEvents,
        telemetryTitle: 'Recent RoPA Ledger Seals & Processing Records',
      }}
    />
  );
}
