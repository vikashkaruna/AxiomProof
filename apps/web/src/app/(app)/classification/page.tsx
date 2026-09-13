import { GenericModuleView } from '../generic-module-view';

export const dynamic = 'force-dynamic';

export default function ClassificationPage() {
  return (
    <GenericModuleView
      meta={{
        title: 'Classification',
        hi: 'वर्गीकरण',
        phase: 'P1',
        agent: 'Vibhaag',
        autonomy: 'L2 (read-only)',
        moduleId: 'M2.3',
        desc: 'Vibhaag classifies discovered fields into DPDPA categories with confidence scoring. Low-confidence items route to a human review queue; corrections become training signal.',
        cards: [
          {
            h: 'By category',
            rows: [
              { t: 'Identifiers (name, phone, PAN)', v: '2,840', dot: '#1E2A4A' },
              { t: 'Sensitive — financial', v: '1,120', dot: '#D9534F' },
              { t: 'Children’s data flagged', v: '38', dot: '#D9534F' },
            ],
          },
          {
            h: 'Review queue',
            rows: [
              { t: 'Low-confidence (<0.7)', v: '54 items', dot: '#E0A82E' },
              { t: 'Awaiting human confirm', v: '12', dot: '#E0A82E' },
              { t: 'Confirmed this week', v: '201', dot: '#0FB5A5' },
            ],
          },
        ],
      }}
    />
  );
}
