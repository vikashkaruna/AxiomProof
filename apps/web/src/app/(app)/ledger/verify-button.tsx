'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@axiom/ui';

export function VerifyButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch('/api/bff/v1/ledger/verify', { method: 'POST' });
      const body = await res.json();
      alert(
        body.intact
          ? 'Chain verified: every entry hash and prev_hash matches. Audit trail is intact.'
          : `Chain break at sequence ${body.firstBreak?.sequenceNo}: ${body.firstBreak?.reason}`,
      );
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={run} loading={busy}>
      Verify chain integrity
    </Button>
  );
}
