import { GenericModuleView } from '../generic-module-view';

export const dynamic = 'force-dynamic';

export default function DiscoveryPage() {
  return (
    <GenericModuleView
      meta={{
        title: 'Data Discovery',
        hi: 'डेटा खोज',
        phase: 'P1',
        agent: 'Drishti',
        autonomy: 'L2 (read-only)',
        moduleId: 'M2.2',
        desc: 'Drishti finds personal data across connected systems — batch sweep of the whole estate or targeted at one schema. Read-only by default; write access is a separate, explicit grant.',
        cards: [
          {
            h: 'Latest scans',
            rows: [
              { t: 'Full estate sweep — Postgres prod', v: '12.4M rows', dot: '#0FB5A5' },
              { t: 'Google Workspace — targeted', v: '8,210 files', dot: '#0FB5A5' },
              { t: 'S3 object store — incremental', v: '+340 obj', dot: '#E0A82E' },
            ],
          },
          {
            h: 'Discovered surfaces',
            rows: [
              { t: 'Tables containing personal data', v: '47', dot: '#1E2A4A' },
              { t: 'Cross-border flows flagged', v: '2', dot: '#D9534F' },
              { t: 'Third-party processors', v: '6', dot: '#E0A82E' },
            ],
          },
        ],
      }}
    />
  );
}
