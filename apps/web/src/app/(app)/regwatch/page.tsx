import { GenericModuleView } from '../generic-module-view';

export const dynamic = 'force-dynamic';

export default function RegWatchPage() {
  return (
    <GenericModuleView
      meta={{
        title: 'Regulatory Watch',
        hi: 'नियामक निगरानी',
        phase: 'P2',
        agent: 'Nazar',
        autonomy: 'L3',
        moduleId: 'M2.9',
        desc: 'Nazar monitors MeitY / DPB / gazette sources, flags changes and maps each change to the affected controls in the library.',
        cards: [
          {
            h: 'Recent signals',
            rows: [
              { t: 'SDF window 18→12mo (proposal)', v: 'unGazetted', dot: '#E0A82E' },
              { t: 'DPB staffing update', v: 'legal press', dot: '#1E2A4A' },
              { t: 'Consent Mgr registry opens', v: '~13 Nov', dot: '#0FB5A5' },
            ],
          },
          {
            h: 'Impact mapping',
            rows: [
              { t: 'Controls affected', v: '4', dot: '#E0A82E' },
              { t: 'Clients notified', v: '3', dot: '#0FB5A5' },
              { t: 'Library update queued', v: 'v25.11.3', dot: '#1E2A4A' },
            ],
          },
        ],
      }}
    />
  );
}
