import { type HTMLAttributes } from 'react';
import { cn } from '../utils';
import { Badge } from '../primitives/Badge';

export type StatusKind =
  | 'draft'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'awaiting'
  | 'awaiting_dry_run'
  | 'dry_run'
  | 'dry_run_complete'
  | 'dry_run_pending'
  | 'dry_run_failed'
  | 'awaiting_approval'
  | 'succeeded'
  | 'failed'
  | 'partial_failure'
  | 'rolled_back'
  | 'completed'
  | 'pending'
  | 'queued'
  | 'running'
  | 'cancelled'
  | 'timed_out'
  | 'executing'
  | 'closed'
  | 'detected'
  | 'triaging'
  | 'contained'
  | 'notifying'
  | 'sealed'
  | 'issued'
  | 'consumed'
  | 'revoked'
  | 'expired'
  | 'invalid'
  | 'skipped'
  | 'intake'
  | 'discovery'
  | 'classification'
  | 'assessment'
  | 'planning'
  | 'open'
  | 'planned'
  | 'in_remediation'
  | 'accepted_risk'
  | 'received'
  | 'identity_verification'
  | 'in_fulfilment'
  | 'escalated'
  | 'active'
  | 'inactive'
  | 'pass'
  | 'fail'
  | 'gap'
  | 'compliant'
  | 'non_compliant'
  | (string & {});

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'indigo' | 'proof';
  }
> = {
  draft: { label: 'Draft', variant: 'neutral' },
  in_progress: { label: 'In Progress', variant: 'info' },
  review: { label: 'In Review', variant: 'indigo' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  awaiting: { label: 'Awaiting', variant: 'warning' },
  awaiting_dry_run: { label: 'Awaiting Dry-Run', variant: 'warning' },
  dry_run: { label: 'Dry-Run', variant: 'info' },
  dry_run_complete: { label: 'Dry-Run Complete', variant: 'success' },
  dry_run_pending: { label: 'Dry-Run Pending', variant: 'warning' },
  dry_run_failed: { label: 'Dry-Run Failed', variant: 'danger' },
  awaiting_approval: { label: 'Awaiting Approval', variant: 'warning' },
  succeeded: { label: 'Succeeded', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  partial_failure: { label: 'Partial Failure', variant: 'danger' },
  rolled_back: { label: 'Rolled Back', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  pending: { label: 'Pending', variant: 'neutral' },
  queued: { label: 'Queued', variant: 'neutral' },
  running: { label: 'Running', variant: 'info' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
  timed_out: { label: 'Timed Out', variant: 'warning' },
  executing: { label: 'Executing', variant: 'info' },
  closed: { label: 'Closed', variant: 'success' },
  detected: { label: 'Detected', variant: 'danger' },
  triaging: { label: 'Triaging', variant: 'warning' },
  contained: { label: 'Contained', variant: 'info' },
  notifying: { label: 'Notifying', variant: 'warning' },
  sealed: { label: 'Sealed', variant: 'proof' },
  issued: { label: 'Issued', variant: 'info' },
  consumed: { label: 'Consumed', variant: 'success' },
  revoked: { label: 'Revoked', variant: 'warning' },
  expired: { label: 'Expired', variant: 'neutral' },
  invalid: { label: 'Invalid', variant: 'danger' },
  skipped: { label: 'Skipped', variant: 'neutral' },
  intake: { label: 'Intake', variant: 'neutral' },
  discovery: { label: 'Discovery', variant: 'info' },
  classification: { label: 'Classification', variant: 'indigo' },
  assessment: { label: 'Assessment', variant: 'info' },
  planning: { label: 'Planning', variant: 'indigo' },
  open: { label: 'Open', variant: 'warning' },
  planned: { label: 'Planned', variant: 'indigo' },
  in_remediation: { label: 'In Remediation', variant: 'info' },
  accepted_risk: { label: 'Accepted Risk', variant: 'warning' },
  received: { label: 'Received', variant: 'neutral' },
  identity_verification: { label: 'Identity Verification', variant: 'warning' },
  in_fulfilment: { label: 'In Fulfilment', variant: 'info' },
  escalated: { label: 'Escalated', variant: 'danger' },
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'neutral' },
  pass: { label: 'Pass', variant: 'success' },
  fail: { label: 'Fail', variant: 'danger' },
  gap: { label: 'Gap', variant: 'danger' },
  compliant: { label: 'Compliant', variant: 'success' },
  non_compliant: { label: 'Non-Compliant', variant: 'danger' },
};

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusKind | string;
  className?: string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase().trim();
  const c = statusConfig[normalized] ?? {
    label: (status || 'Unknown').replace(/_/g, ' '),
    variant: 'neutral' as const,
  };
  return (
    <Badge variant={c.variant} className={cn('capitalize', className)} {...props}>
      {c.label}
    </Badge>
  );
}
