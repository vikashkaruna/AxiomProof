import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdmin } from '@axiom/supabase';
import { PageHeader, Card, CardContent, StatusBadge, Badge } from '@axiom/ui';
import { formatDateTime } from '@axiom/ui';

export const dynamic = 'force-dynamic';

export default async function DsarPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createSupabaseAdmin();
  const { data: dsars } = await admin
    .from('dsars')
    .select('*')
    .order('received_at', { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data Subject Access Requests (DSARs)"
        description="Section 11 + Rule 16. 30-day statutory clock. Identity verification before fulfillment. Every step is sealed into the evidence vault."
        meta={<Badge variant="indigo">{(dsars ?? []).length} on record</Badge>}
      />

      <div className="grid grid-cols-1 gap-3">
        {(dsars ?? []).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              No DSARs received. The intake form is wired and ready.
            </CardContent>
          </Card>
        )}
        {(dsars ?? []).map((d: any) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={d.status} />
                    <Badge variant="indigo">{d.kind}</Badge>
                    <h3 className="font-heading text-base font-semibold text-indigo-700">
                      {d.data_principal_name ?? 'Anonymous'}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    {d.data_principal_email ?? '—'} · received {formatDateTime(d.received_at)}
                  </p>
                  {d.notes && <p className="text-xs text-slate-500">{d.notes}</p>}
                </div>
                <div className="text-right text-xs">
                  <p className="text-slate-500">Due by</p>
                  <p className="font-mono text-ember-700">{formatDateTime(d.due_by)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
