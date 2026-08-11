import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdmin } from '@axiom/supabase';
import {
  PageHeader,
  Card,
  CardContent,
  ProofSeal,
  Badge,
} from '@axiom/ui';
import { formatDateTime, truncateHash } from '@axiom/ui';

export const dynamic = 'force-dynamic';

export default async function EvidenceExplorerPage({
  searchParams,
}: {
  searchParams: { q?: string; tenant?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createSupabaseAdmin();
  let query = admin
    .from('evidence')
    .select('id, content_hash, storage_uri, evidence_type, description, collected_by_agent, collected_at, filename, byte_size, demonstrates_control_ids')
    .order('collected_at', { ascending: false })
    .limit(50);

  if (searchParams.q) {
    query = query.ilike('description', `%${searchParams.q}%`);
  }

  const { data: evidence } = await query;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Evidence Explorer"
        description="Sealed, content-addressed, append-only. Every artifact is WORM-locked in S3 (Object Lock Compliance mode) and linked to the controls it demonstrates."
        meta={<Badge variant="proof">{(evidence ?? []).length} of latest 50</Badge>}
      />

      <form action="/evidence" method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder="Search by description…"
          className="flex h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        />
        <button
          type="submit"
          className="rounded-md bg-indigo-500 px-4 text-sm font-medium text-white hover:bg-indigo-600"
        >
          Search
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3">
        {(evidence ?? []).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              No evidence yet. Saakshi seals artifacts as Parikshan assessments run.
            </CardContent>
          </Card>
        )}
        {(evidence ?? []).map((e: any) => (
          <Card key={e.id}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="indigo">{e.evidence_type}</Badge>
                    <ProofSeal hash={e.content_hash} />
                    {e.filename && (
                      <span className="font-mono text-xs text-slate-500">{e.filename}</span>
                    )}
                  </div>
                  {e.description && (
                    <p className="text-sm text-slate-700">{e.description}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Collected by <span className="font-medium">{e.collected_by_agent}</span> on{' '}
                    {formatDateTime(e.collected_at)}
                  </p>
                  {e.demonstrates_control_ids?.length > 0 && (
                    <p className="text-xs text-slate-500">
                      Demonstrates:{' '}
                      {e.demonstrates_control_ids.map((id: string) => (
                        <code
                          key={id}
                          className="mr-1 rounded bg-mist-100 px-1 font-mono text-[10px] text-indigo-700"
                        >
                          {id}
                        </code>
                      ))}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-slate-500">
                  {e.byte_size != null && (
                    <p>{(e.byte_size / 1024).toFixed(1)} KB</p>
                  )}
                  <a
                    href={e.storage_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] text-teal-600 hover:underline"
                  >
                    s3://{e.storage_uri.replace(/^s3:\/\//, '').split('/').slice(1).join('/')}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
