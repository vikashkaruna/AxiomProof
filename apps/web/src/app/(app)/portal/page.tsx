import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdmin } from '@axiom/supabase';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Stat,
  StatGrid,
  PostureScore,
  StatusBadge,
  AgentPill,
  Badge,
  Button,
} from '@axiom/ui';
import { formatDate } from '@axiom/ui';

export const dynamic = 'force-dynamic';

export default async function ClientPortalPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // For the founder preview: pull the first tenant as the active context.
  const admin = createSupabaseAdmin();
  const { data: tenants } = await admin.from('tenants').select('id, name').limit(1);
  const tenant = tenants?.[0];

  if (!tenant) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Client Portal"
          description="Each client sees their own posture, open gaps, pending approvals, evidence library, and report archive."
        />
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No tenants on record. Once a client engagement begins, their posture and pending
            approvals will appear here.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [engagementRes, planRes, evidenceRes, dsarRes, breachRes] = await Promise.all([
    admin
      .from('engagements')
      .select('id, title, status, posture_score, estimated_exposure_inr, started_at')
      .eq('tenant_id', tenant.id)
      .order('started_at', { ascending: false })
      .limit(1),
    admin
      .from('remediation_plans')
      .select('id, title, status, created_at')
      .eq('tenant_id', tenant.id)
      .in('status', ['draft', 'review', 'approved', 'executing'])
      .order('created_at', { ascending: false })
      .limit(5),
    admin
      .from('evidence')
      .select('id, content_hash, evidence_type, description, collected_at, collected_by_agent')
      .eq('tenant_id', tenant.id)
      .order('collected_at', { ascending: false })
      .limit(5),
    admin
      .from('dsars')
      .select('id, kind, status, due_by')
      .eq('tenant_id', tenant.id)
      .in('status', ['received', 'identity_verification', 'in_fulfilment'])
      .order('due_by', { ascending: true })
      .limit(5),
    admin
      .from('breaches')
      .select('id, title, status, severity, dpb_notification_due_by')
      .eq('tenant_id', tenant.id)
      .in('status', ['detected', 'triaging', 'contained', 'notifying_dpb', 'notifying_principals'])
      .order('dpb_notification_due_by', { ascending: true })
      .limit(5),
  ]);

  const engagement = (engagementRes.data ?? [])[0] as any;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome, ${tenant.name}`}
        description="Your DPDPA compliance posture, in one place. Approve agent-proposed remediations, browse sealed evidence, and watch your audit trail grow."
        meta={
          <>
            <Badge variant="proof">L1 — Agent-Proposes</Badge>
            <Badge variant="indigo">Phase 1</Badge>
          </>
        }
      />

      {engagement ? (
        <Card>
          <CardHeader>
            <CardTitle>Current engagement</CardTitle>
            <CardDescription>{engagement.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <PostureScore
              score={engagement.posture_score}
              exposureInr={engagement.estimated_exposure_inr}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No active engagement. Reach out to your Axiom Proof delivery lead to begin a readiness
            assessment.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending approvals</CardTitle>
            <CardDescription>Plans awaiting your review in the Approval Console.</CardDescription>
          </CardHeader>
          <CardContent>
            {(planRes.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Nothing waiting on you. Good.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(planRes.data ?? []).map((p: any) => (
                  <li key={p.id}>
                    <Link
                      href={`/plans/${p.id}`}
                      className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 hover:bg-mist-100"
                    >
                      <span className="text-sm font-medium text-slate-700">{p.title}</span>
                      <StatusBadge status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent evidence</CardTitle>
            <CardDescription>Sealed by Saakshi.</CardDescription>
          </CardHeader>
          <CardContent>
            {(evidenceRes.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No evidence yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(evidenceRes.data ?? []).map((e: any) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="indigo">{e.evidence_type}</Badge>
                      <span className="text-sm text-slate-700">
                        {e.description ?? '(no description)'}
                      </span>
                    </div>
                    <AgentPill agent={e.collected_by_agent as any} showPersona={false} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open DSARs</CardTitle>
          </CardHeader>
          <CardContent>
            {(dsarRes.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No open requests.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(dsarRes.data ?? []).map((d: any) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="indigo">{d.kind}</Badge>
                      <StatusBadge status={d.status} />
                    </div>
                    <span className="text-xs text-slate-500">Due {formatDate(d.due_by)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active breaches</CardTitle>
          </CardHeader>
          <CardContent>
            {(breachRes.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No active breaches.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(breachRes.data ?? []).map((b: any) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between rounded-md border border-ember-500 bg-ember-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <StatusBadge status={b.status} />
                      <span className="text-sm font-medium text-slate-700">{b.title}</span>
                    </div>
                    <span className="text-xs text-ember-700">
                      DPB due {formatDate(b.dpb_notification_due_by)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
