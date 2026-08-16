import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdmin } from '@axiom/supabase';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  Badge,
} from '@axiom/ui';
import { formatDateTime } from '@axiom/ui';

export const dynamic = 'force-dynamic';

export default async function BreachesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createSupabaseAdmin();
  const { data: breaches } = await admin
    .from('breaches')
    .select('*')
    .order('detected_at', { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Breach & incident ops"
        description="72-hour DPB notification clock (Section 8(6)). Every breach has an owner, a statutory due time, and a forensic log trail."
        meta={<Badge variant="indigo">{(breaches ?? []).length} on record</Badge>}
      />

      <div className="grid grid-cols-1 gap-3">
        {(breaches ?? []).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              No breaches recorded. (Good news.)
            </CardContent>
          </Card>
        )}
        {(breaches ?? []).map((b: any) => (
          <Card key={b.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={b.status} />
                    <Badge variant={b.severity === 'critical' ? 'danger' : 'warning'}>
                      {b.severity}
                    </Badge>
                    <h3 className="font-heading text-base font-semibold text-indigo-700">
                      {b.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600">{b.description}</p>
                  <p className="text-xs text-slate-500">
                    Detected {formatDateTime(b.detected_at)} · Affects {b.affected_count ?? '?'}{' '}
                    data principal(s) · {b.data_categories?.length ?? 0} categories
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-slate-500">DPB notification due</p>
                  <p className="font-mono text-ember-700">
                    {formatDateTime(b.dpb_notification_due_by)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
