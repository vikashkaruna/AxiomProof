import { GenericModuleView } from '../generic-module-view';

export const dynamic = 'force-dynamic';

export default function ReportsPage() {
  return (
    <GenericModuleView
      meta={{
        title: 'Reports',
        hi: 'रिपोर्ट',
        phase: 'P2',
        agent: 'Prativedan',
        autonomy: 'L3',
        moduleId: 'M2.7',
        desc: 'Prativedan generates Board reports, auditor packs, DPB-ready submissions and technical remediation registers. Every claim traceable to a specific evidence artifact; agent attribution and human approver named on every report.',
        cards: [
          {
            h: 'Report types',
            rows: [
              { t: 'Board report', v: 'branded PDF', dot: '#1E2A4A' },
              { t: 'Auditor pack', v: '+ evidence', dot: '#C9A227' },
              { t: 'DPB-ready submission', v: 'template', dot: '#1E2A4A' },
            ],
          },
          {
            h: 'Generated',
            rows: [
              { t: 'This quarter', v: '11', dot: '#0FB5A5' },
              { t: 'Avg gen time', v: '3.4 min', dot: '#1E2A4A' },
              { t: 'All approver-signed', v: '✓', dot: '#0FB5A5' },
            ],
          },
        ],
      }}
    />
  );
}
