import { GenericModuleView } from '../generic-module-view';

export const dynamic = 'force-dynamic';

export default function PoliciesPage() {
  return (
    <GenericModuleView
      meta={{
        title: 'Standing Approval Policies',
        hi: 'स्थायी नीतियाँ',
        phase: 'P4',
        agent: 'Policy Engine',
        autonomy: 'L3',
        moduleId: 'M4.1',
        desc: 'Human authors policy — e.g. “auto-remediate expired-retention deletions under 1,000 records in non-production, without per-instance approval.” Agents operate within it; everything outside escalates.',
        cards: [
          {
            h: 'Active policies',
            rows: [
              { t: 'Expired-retention deletes <1k (non-prod)', v: 'auto', dot: '#0FB5A5' },
              { t: 'Consent-notice text updates', v: 'auto', dot: '#0FB5A5' },
              { t: 'All production writes', v: 'escalate', dot: '#D9534F' },
            ],
          },
          {
            h: 'This week',
            rows: [
              { t: 'Auto-remediated in policy', v: '42', dot: '#0FB5A5' },
              { t: 'Escalated to human', v: '6', dot: '#E0A82E' },
              { t: 'Policy violations', v: '0', dot: '#0FB5A5' },
            ],
          },
        ],
      }}
    />
  );
}
