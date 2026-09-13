import { GenericModuleView } from '../generic-module-view';

export const dynamic = 'force-dynamic';

export default function DataMapPage() {
  return (
    <GenericModuleView
      meta={{
        title: 'Data Map & RoPA',
        hi: 'डेटा मानचित्र',
        phase: 'P1',
        agent: 'Vibhaag',
        autonomy: 'L1',
        moduleId: 'M1.3',
        desc: 'Auto-generated Record of Processing Activities from discovery + classification output, including data-flow mapping and cross-border transfers.',
        cards: [
          {
            h: 'RoPA entries',
            rows: [
              { t: 'Processing activities', v: '34', dot: '#1E2A4A' },
              { t: 'With lawful basis mapped', v: '29', dot: '#0FB5A5' },
              { t: 'Missing basis', v: '5', dot: '#D9534F' },
            ],
          },
          {
            h: 'Data flows',
            rows: [
              { t: 'Internal systems', v: '18', dot: '#1E2A4A' },
              { t: 'To processors', v: '6', dot: '#E0A82E' },
              { t: 'Cross-border', v: '2', dot: '#D9534F' },
            ],
          },
        ],
      }}
    />
  );
}
