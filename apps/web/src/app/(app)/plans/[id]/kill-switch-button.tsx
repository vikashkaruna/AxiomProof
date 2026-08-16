'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@axiom/ui';

export function KillSwitchButton({ planId, tenantId }: { planId: string; tenantId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function engage() {
    if (
      !confirm(
        'ENGAGE KILL SWITCH?\n\nThis will halt ALL in-flight execution globally and ' +
          'prevent any further agent execution until reset. This action is recorded ' +
          'in the audit ledger and is not reversible by the system — only by the founder.',
      )
    )
      return;
    setBusy(true);
    try {
      await fetch('/api/bff/v1/kill-switch/engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({ scope: 'tenant', reason: 'Manual engagement from UI' }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="danger" size="sm" onClick={engage} loading={busy}>
      Engage kill switch
    </Button>
  );
}
