import { GenericModuleView } from '../generic-module-view';

export const dynamic = 'force-dynamic';

export default function MonitoringPage() {
  return (
    <GenericModuleView
      meta={{
        title: 'Continuous Monitoring',
        hi: 'सतत निगरानी',
        phase: 'P3',
        agent: 'Drishti + Parikshan',
        autonomy: 'L3',
        moduleId: 'M3.10',
        desc: 'Scheduled re-discovery and re-assessment with drift detection and alerting on newly-introduced gaps.',
        cards: [
          {
            h: 'Schedules',
            rows: [
              { t: 'Weekly estate re-scan', v: 'Mon 02:00', dot: '#0FB5A5' },
              { t: 'Daily consent-drift check', v: 'enabled', dot: '#0FB5A5' },
              { t: 'Drift alerts (7d)', v: '3', dot: '#E0A82E' },
            ],
          },
          {
            h: 'Detected drift',
            rows: [
              { t: 'New table, unclassified', v: 'crm.leads', dot: '#D9534F' },
              { t: 'Retention breach', v: 'logs_2019', dot: '#D9534F' },
              { t: 'Resolved', v: '2', dot: '#0FB5A5' },
            ],
          },
        ],
      }}
    />
  );
}
