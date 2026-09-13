'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Textarea, generateUUID } from '@axiom/ui';

interface Action {
  id: string;
  action_type: string;
  description: string;
  risk_class: 'low' | 'medium' | 'high' | 'critical';
  approval_status: string;
  dry_run_status: string;
  rollback_validated: boolean;
}

interface Props {
  planId: string;
  tenantId: string;
  planStatus?: string;
  actions: Action[];
  eligible: Action[];
  blocked: Action[];
}

export function ApprovalActions({
  planId,
  tenantId,
  planStatus = 'review',
  actions,
  eligible,
  blocked,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(eligible.map((a) => a.id)));
  const [reason, setReason] = useState('');
  const [concurrency, setConcurrency] = useState(1);
  const [stopOnFailure, setStopOnFailure] = useState(true);
  const [expiresInMinutes, setExpiresInMinutes] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [approvalToken, setApprovalToken] = useState<string | null>(null);
  const [approvedActionIds, setApprovedActionIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function submit() {
    setError(null);
    setSuccess(null);
    if (selected.size === 0) {
      setError('Select at least one action to approve.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/bff/v1/plans/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({
          planId,
          actionIds: Array.from(selected),
          mode: 'batch',
          concurrency,
          stopOnFailure,
          expiresInMinutes,
          reason: reason || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message ?? `Approval failed (HTTP ${res.status})`);
        return;
      }
      const body = await res.json();
      setApprovalToken(JSON.stringify(body.token));
      setApprovedActionIds(Array.from(selected));
      setSuccess(`Approved ${selected.size} action(s). Signed approval token issued.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function execute() {
    if (!approvalToken || approvedActionIds.length === 0) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bff/v1/plans/${planId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
          'Idempotency-Key': generateUUID(),
        },
        body: JSON.stringify({
          planId,
          approvalToken,
          actionIds: approvedActionIds,
          mode: 'batch',
          concurrency,
          stopOnFailure,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message ?? `Execution failed (HTTP ${res.status})`);
        return;
      }
      setApprovalToken(null);
      setApprovedActionIds([]);
      setSuccess('Actions executed successfully.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Execution failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function reject() {
    if (!confirm('Reject the plan? This will mark all actions as rejected/skipped.')) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bff/v1/plans/${planId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message ?? `Rejection failed (HTTP ${res.status})`);
        return;
      }
      setSuccess('Plan rejected. Actions have been marked as skipped.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject plan');
    } finally {
      setSubmitting(false);
    }
  }

  if (planStatus === 'completed') {
    return (
      <div className="rounded-md border border-teal-500 bg-teal-50 p-4 text-sm text-teal-800">
        <strong>Plan execution completed.</strong> All remediation actions have been executed and
        recorded in the immutable audit ledger.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {planStatus === 'cancelled' && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          This remediation plan is currently marked as cancelled/rejected. You may still re-approve
          eligible actions below to reinstate and approve them.
        </div>
      )}

      {blocked.length > 0 && (
        <div className="rounded-md border border-ember-500 bg-ember-50 p-3 text-sm text-ember-700">
          <strong>{blocked.length} action(s) blocked</strong> — not eligible for approval. Need a
          completed dry-run AND a validated rollback. The BFF will refuse to issue an approval token
          that includes a blocked action.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-ember-500 bg-ember-50 p-3 text-sm text-ember-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-teal-500 bg-teal-50 p-3 text-sm text-teal-800">
          {success}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() => setSelected(new Set(eligible.map((a) => a.id)))}
          size="sm"
        >
          Select all eligible
        </Button>
        <Button variant="ghost" onClick={() => setSelected(new Set())} size="sm">
          Clear
        </Button>
        <span className="text-sm text-slate-500">
          {selected.size} of {eligible.length} eligible selected
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="concurrency">Concurrency</Label>
          <Input
            id="concurrency"
            type="number"
            min={1}
            max={20}
            value={concurrency}
            onChange={(e) => setConcurrency(Math.max(1, Number(e.target.value)))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expires">Expires in (minutes)</Label>
          <Input
            id="expires"
            type="number"
            min={1}
            max={10080}
            value={expiresInMinutes}
            onChange={(e) => setExpiresInMinutes(Math.max(1, Number(e.target.value)))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stop">Stop on failure</Label>
          <div className="flex items-center gap-2 pt-2">
            <input
              id="stop"
              type="checkbox"
              checked={stopOnFailure}
              onChange={(e) => setStopOnFailure(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">Halt the batch on first action failure</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">Reason (optional, recorded in the ledger)</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Client CFO approved in writing on 2026-08-11"
          rows={2}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="accent"
          size="lg"
          onClick={submit}
          loading={submitting}
          disabled={selected.size === 0}
        >
          Approve {selected.size} action{selected.size === 1 ? '' : 's'}
        </Button>
        {approvalToken && (
          <Button variant="primary" size="lg" onClick={execute} loading={submitting}>
            Execute approved actions
          </Button>
        )}
        <Button variant="ghost" size="lg" onClick={() => router.refresh()}>
          Refresh
        </Button>
        <Button
          variant="danger"
          size="lg"
          onClick={reject}
          loading={submitting}
          disabled={submitting}
        >
          Reject plan
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        On approval, the BFF issues a signed, scope-bound token via the Approval Engine. The token
        is the gate (per ADR-2). A separate execute call is required to actually run — the token
        itself doesn&apos;t execute.
      </p>
    </div>
  );
}
