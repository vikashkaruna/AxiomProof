import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdmin } from '@axiom/supabase';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  StatusBadge,
  SeverityChip,
  Button,
  ProofSeal,
} from '@axiom/ui';
import { formatDateTime, formatINR, truncateHash } from '@axiom/ui';
import { ApprovalActions } from './approval-actions';
import { KillSwitchButton } from './kill-switch-button';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createSupabaseAdmin();
  const { data: plan, error } = await admin
    .from('remediation_plans')
    .select(
      `
      *,
      remediation_actions (*),
      tenants:tenant_id (id, name, slug)
    `,
    )
    .eq('id', id)
    .single();

  if (error || !plan) notFound();

  const actions = (plan.remediation_actions ?? []).sort(
    (a: any, b: any) => a.sequence - b.sequence,
  );

  const eligible = actions.filter(
    (a: any) => a.dry_run_status === 'dry_run_complete' && a.rollback_validated,
  );
  const blocked = actions.filter(
    (a: any) => !(a.dry_run_status === 'dry_run_complete' && a.rollback_validated),
  );
  const aggregateBlast = plan.aggregate_blast_radius as any;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={plan.title}
        description={plan.description ?? 'No description provided.'}
        actions={
          <>
            <KillSwitchButton planId={plan.id} />
            <Button variant="outline" size="sm" asChild={false}>
              <Link href="/plans">Back to plans</Link>
            </Button>
          </>
        }
        meta={
          <>
            <StatusBadge status={plan.status} />
            <Badge variant="indigo">v{plan.version}</Badge>
            <Badge variant="neutral">Library {plan.library_version}</Badge>
            <Badge variant="neutral">Created {formatDateTime(plan.created_at)}</Badge>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Aggregate blast radius
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-indigo-500">
            {aggregateBlast?.recordsAffected ?? 0}
          </p>
          <p className="text-xs text-slate-500">
            records across {aggregateBlast?.systemsAffected?.length ?? 0} system(s)
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Eligible for approval
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-teal-700">{eligible.length}</p>
          <p className="text-xs text-slate-500">of {actions.length} actions</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Blocked</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-ember-700">{blocked.length}</p>
          <p className="text-xs text-slate-500">need dry-run or rollback fix</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Approver</p>
          <p className="mt-1 text-sm font-medium text-indigo-500">
            {user.user_metadata?.full_name ?? user.email}
          </p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval actions</CardTitle>
          <CardDescription>
            Per ADR-2 / BR-1, no mutating action executes without recorded human approval. The
            signature on the token is verified per-action, not just at batch start (per Doc 04
            §4.3). Each action below carries everything needed to make an informed decision: dry-run
            diff, blast radius, risk, and rollback plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApprovalActions
            planId={plan.id}
            actions={actions}
            eligible={eligible}
            blocked={blocked}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {actions.map((a: any) => (
          <ActionCard key={a.id} action={a} />
        ))}
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: any }) {
  const dryRunOk = action.dry_run_status === 'dry_run_complete';
  const rollbackOk = action.rollback_validated;
  const isApproved = action.approval_status === 'approved';
  const isEligible = dryRunOk && rollbackOk;

  return (
    <div
      className={
        isApproved
          ? 'rounded-xl border-2 border-teal-500 bg-white p-5 shadow-sm'
          : isEligible
            ? 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'
            : 'rounded-xl border border-ember-500 bg-ember-50/30 p-5 shadow-sm'
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-500">#{action.sequence}</span>
              <code className="rounded bg-mist-100 px-1.5 py-0.5 font-mono text-xs text-indigo-700">
                {action.action_type}
              </code>
              <SeverityChip severity={action.risk_class} />
              {isApproved && <Badge variant="success">Approved</Badge>}
            </div>
            <p className="text-sm text-slate-700">{action.description}</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>
              Risk score: <span className="font-mono">{action.risk_score}</span>
            </p>
            <p>Closes: {action.closes_finding_ids?.length ?? 0} finding(s)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-mist-50 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Blast radius
            </p>
            <p className="mt-1 font-mono text-sm text-slate-700">
              {(action.blast_radius as any)?.recordsAffected ?? 0} records
            </p>
            <p className="text-xs text-slate-500">
              env: {(action.blast_radius as any)?.environment ?? 'n/a'}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-mist-50 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Dry-run
            </p>
            <p className="mt-1 text-sm">
              <StatusBadge status={action.dry_run_status} />
            </p>
            {action.dry_run_completed_at && (
              <p className="text-xs text-slate-500">
                {formatDateTime(action.dry_run_completed_at)}
              </p>
            )}
            {action.dry_run_expires_at && (
              <p className="text-xs text-slate-500">
                expires {formatDateTime(action.dry_run_expires_at)}
              </p>
            )}
          </div>
          <div className="rounded-md border border-slate-200 bg-mist-50 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Rollback
            </p>
            <p className="mt-1 text-sm">
              {rollbackOk ? <StatusBadge status="approved" /> : <StatusBadge status="awaiting" />}
            </p>
            <p className="text-xs text-slate-500">
              ~{(action.rollback_definition as any)?.estimatedRollbackTimeSeconds ?? 0}s
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-mist-50 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Approval
            </p>
            <p className="mt-1 text-sm">
              <StatusBadge status={action.approval_status} />
            </p>
            {action.approved_at && (
              <p className="text-xs text-slate-500">{formatDateTime(action.approved_at)}</p>
            )}
          </div>
        </div>

        <details className="rounded-md border border-slate-200 bg-mist-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-indigo-700">
            View dry-run diff
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-xs text-slate-100">
            {JSON.stringify(
              action.dry_run_result ?? { note: 'no dry-run result captured' },
              null,
              2,
            )}
          </pre>
        </details>

        <details className="rounded-md border border-slate-200 bg-mist-50 p-3">
          <summary className="cursor-pointer text-sm font-medium text-indigo-700">
            View rollback plan
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-xs text-slate-100">
            {JSON.stringify(action.rollback_definition, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
