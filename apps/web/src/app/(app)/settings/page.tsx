import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@axiom/supabase';
import { PageHeader, Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from '@axiom/ui';
import { BRAND } from '@axiom/config';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Account, tenant membership, security, and audit-trail preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Email
            </dt>
            <dd className="text-sm text-slate-700">{user.email}</dd>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Full name
            </dt>
            <dd className="text-sm text-slate-700">
              {(user.user_metadata as any)?.full_name ?? '—'}
            </dd>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              User ID
            </dt>
            <dd className="font-mono text-xs text-slate-700">{user.id}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            The platform enforces multi-factor authentication for any user with the approver role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            MFA setup: <Badge variant="warning">Not configured</Badge> · Last sign in:{' '}
            {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-IN') : '—'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data residency</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            All tenant data, evidence, and ledger entries are stored in{' '}
            <Badge variant="indigo">{BRAND.dataResidencyRegion}</Badge>. LLM inference
            for personal-data-touching tasks runs through a self-hosted model gateway
            on the same EKS cluster. Per Doc 05 §6, no LLM vendor guarantees India-only
            inference — that's why the Model Gateway redacts PII before egress.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
