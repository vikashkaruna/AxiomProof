import { GenericModuleView } from '../generic-module-view';

export const dynamic = 'force-dynamic';

export default function PartnerPage() {
  return (
    <GenericModuleView
      meta={{
        title: 'Partner / White-label Portal',
        hi: 'भागीदार पोर्टल',
        phase: 'P4',
        autonomy: 'L3',
        moduleId: 'M4.7',
        desc: 'Multi-client management for CA / CS / law / MSP partners, with branded report output. Referral fee or white-label delivery, paid only on realised revenue.',
        cards: [
          {
            h: 'Partner book',
            rows: [
              { t: 'Active partners', v: '5', dot: '#1E2A4A' },
              { t: 'Managed clients', v: '23', dot: '#0FB5A5' },
              { t: 'White-label brands', v: '3', dot: '#C9A227' },
            ],
          },
          {
            h: 'Economics',
            rows: [
              { t: 'Referral fee', v: '15–20%', dot: '#1E2A4A' },
              { t: 'White-label', v: '60–65% list', dot: '#1E2A4A' },
              { t: 'Paid on', v: 'realised rev', dot: '#0FB5A5' },
            ],
          },
        ],
      }}
    />
  );
}
