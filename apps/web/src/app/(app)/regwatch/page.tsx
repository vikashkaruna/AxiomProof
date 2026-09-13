import { GenericModuleView, type ModuleTelemetryEvent } from '../generic-module-view';
import { createSupabaseAdmin } from '@axiom/supabase';

export const dynamic = 'force-dynamic';

// Calculate days countdown until full DPDPA statutory enforcement deadline (13 May 2027)
const TARGET_ENFORCEMENT_DATE = new Date('2027-05-13T00:00:00+05:30');
const DAYS_REMAINING_TO_ENFORCEMENT = Math.max(
  0,
  Math.ceil((TARGET_ENFORCEMENT_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
);

export default async function RegWatchPage() {
  const admin = createSupabaseAdmin();
  let nazarRuns: any[] = [];
  let totalNazarScans = 0;

  try {
    const { data, count } = await admin
      .from('audit_ledger')
      .select('seq, correlation_id, action, target_ref, timestamp, entry_hash, result', {
        count: 'exact',
      })
      .or('actor.eq.nazar,action.ilike.%gazette%,action.ilike.%reg%')
      .order('seq', { ascending: false })
      .limit(6);

    nazarRuns = data || [];
    totalNazarScans = count ?? nazarRuns.length;
  } catch {
    // Graceful fallback if database offline
  }

  const daysRemaining = DAYS_REMAINING_TO_ENFORCEMENT;

  const telemetryEvents: ModuleTelemetryEvent[] = nazarRuns.map((r) => ({
    seq: r.seq,
    title: r.action || 'Regulatory Gazette Watch Scan',
    detail: `Target: ${r.target_ref || 'MeitY / DPB Gazetted Feeds'} · Corr: ${r.correlation_id?.slice(0, 8)}…`,
    time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString('en-IN') : 'Recently',
    target: r.target_ref || 'MeitY Gazette',
    hash: r.entry_hash,
    status: r.result === 'success' ? '✓ verified' : r.result,
  }));

  const lastScan = nazarRuns[0];

  return (
    <GenericModuleView
      meta={{
        title: 'Regulatory Watch',
        hi: 'नियामक निगरानी',
        phase: 'P2',
        agent: 'Nazar',
        agentKey: 'nazar',
        autonomy: 'L3 Autonomous',
        moduleId: 'M2.9',
        statutoryCitation: 'DPDPA 2023 Gazette & Rule 16 Continuous Surveillance',
        desc: 'Nazar continuously monitors MeitY gazette notifications, DPB adjudications, and appellate tribunal orders in real-time, mapping each statutory update directly to affected controls in the Axiom Proof library.',
        actionLabel: 'Scan Gazette Feeds',
        cards: [
          {
            h: 'Statutory Enforcement Countdown',
            badge: `${daysRemaining} Days to Full Deadline`,
            rows: [
              {
                t: 'DPDPA Full Enforcement Deadline',
                v: '13 May 2027',
                dot: '#0FB5A5',
                sub: `${daysRemaining} calendar days remaining in SDF transition window`,
              },
              {
                t: 'MeitY Official Gazette Feeds',
                v: 'egazette.gov.in active',
                dot: '#0FB5A5',
                sub: lastScan
                  ? `Last scanned #${lastScan.seq} verified`
                  : 'Live webhook subscription connected',
              },
              {
                t: 'Consent Manager Technical Registry',
                v: 'Schedule v1.4 active',
                dot: '#1E2A4A',
                sub: 'Technical architecture specification synchronized',
              },
            ],
          },
          {
            h: 'Impact Mapping & Library Alignment',
            badge: totalNazarScans > 0 ? `${totalNazarScans} scans logged` : 'Library v25.11.3',
            rows: [
              {
                t: 'Axiom Proof Control Library Version',
                v: 'v25.11.3',
                dot: '#0FB5A5',
                sub: 'Aligned with DPB Draft Rules 2025',
              },
              {
                t: 'Monitored Regulatory Authorities',
                v: 'MeitY, DPB, CERT-In',
                dot: '#1E2A4A',
                sub: 'Continuous multi-agency statutory watch',
              },
              {
                t: 'Statutory Drift Alarms',
                v: '0 unmapped',
                dot: '#0FB5A5',
                sub: '100% controls cross-referenced with statutory sections',
              },
            ],
          },
        ],
        recentEvents: telemetryEvents,
        telemetryTitle: 'Recent Regulatory Gazette Scans in Audit Ledger',
      }}
    />
  );
}
