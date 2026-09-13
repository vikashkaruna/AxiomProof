import { GenericModuleView } from '../generic-module-view';

export const dynamic = 'force-dynamic';

export default function ConnectorsPage() {
  return (
    <GenericModuleView
      meta={{
        title: 'Connectors',
        hi: 'कनेक्टर',
        phase: 'P2',
        autonomy: 'L2',
        moduleId: 'M2.1',
        desc: 'Pluggable read-only connectors with a common contract: authenticate → enumerate → sample → read → (write). Read and write are separate interfaces with separate, time-bound, revocable credential scopes.',
        cards: [
          {
            h: 'Connected',
            rows: [
              { t: 'PostgreSQL · prod', v: 'read-only', dot: '#0FB5A5' },
              { t: 'Google Workspace', v: 'read-only', dot: '#0FB5A5' },
              { t: 'AWS S3', v: 'read + write*', dot: '#E0A82E' },
            ],
          },
          {
            h: 'Grants',
            rows: [
              { t: 'Write scopes active', v: '1', dot: '#E0A82E' },
              { t: 'Auto-expiry', v: '24h', dot: '#1E2A4A' },
              { t: 'Revocable', v: 'instant', dot: '#0FB5A5' },
            ],
          },
        ],
      }}
    />
  );
}
