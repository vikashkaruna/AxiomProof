import { type HTMLAttributes } from 'react';
import { cn } from '../utils.js';
import { Badge } from '../primitives/Badge.js';

export type StatusKind =
  | 'draft'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'awaiting'
  | 'succeeded'
  | 'failed'
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
  | 'invalid';

const statusConfig: Record<StatusKind, { label: string; variant: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'indigo' | 'proof' }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  in_progress: { label: 'In Progress', variant: 'info' },
  review: { label: 'In Review', variant: 'indigo' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  awaiting: { label: 'Awaiting', variant: 'warning' },
  succeeded: { label: 'Succeeded', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
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
};

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusKind;
  className?: string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const c = statusConfig[status];
  return (
    <Badge variant={c.variant} className={cn('capitalize', className)} {...props}>
      {c.label}
    </Badge>
  );
}
