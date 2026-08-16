import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdmin } from '@axiom/supabase';
import { PageHeader, Card, CardContent, Badge, ProofSeal, AgentPill } from '@axiom/ui';
import { formatDateTime, truncateHash } from '@axiom/ui';
import { VerifyButton } from './verify-button';

export const dynamic = 'force-dynamic';

interface LedgerVerification {
  intact: boolean;
  firstBreak?: { sequence_no?: number } | null;
}

export default async function LedgerPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('is_axiom_internal')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError || !profile?.is_axiom_internal) redirect('/portal');

  const admin = createSupabaseAdmin();

  // Verify chain integrity
  const { data: tenants } = await admin.from('tenants').select('id, name').limit(1);

  let verification: LedgerVerification = { intact: true };
  if (tenants && tenants.length > 0 && tenants[0]) {
    const { data } = await admin.rpc('verify_ledger', {
      p_tenant_id: tenants[0].id,
      p_from_sequence: 1,
    });
    if (data && data.length > 0) {
      verification = {
        intact: false,
        firstBreak: data[0] as LedgerVerification['firstBreak'],
      };
    }
  }

  const { data: entries } = await admin
    .from('audit_ledger')
    .select('*')
    .order('sequence_no', { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit ledger"
        description="Append-only, hash-chained, tamper-evident. Every agent action, every human approval, every state change — recorded in the order it happened, with a verifiable chain."
        actions={<VerifyButton />}
        meta={
          verification.intact ? (
            <Badge variant="success">Chain intact</Badge>
          ) : (
            <Badge variant="danger">
              Chain break at sequence {verification.firstBreak?.sequence_no}
            </Badge>
          )
        }
      />

      <div className="grid grid-cols-1 gap-3">
        {(entries ?? []).map((e) => (
          <Card key={e.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500">#{e.sequence_no}</span>
                    <Badge variant="indigo">{e.actor_type}</Badge>
                    {e.actor_type === 'agent' && (
                      <AgentPill agent={e.actor_id} showPersona={false} />
                    )}
                    {e.actor_type === 'human' && (
                      <span className="text-sm font-medium text-slate-700">{e.actor_id}</span>
                    )}
                    <code className="rounded bg-mist-100 px-1.5 py-0.5 font-mono text-xs text-indigo-700">
                      {e.action_type}
                    </code>
                    {e.result === 'success' && <Badge variant="success">success</Badge>}
                    {e.result === 'failure' && <Badge variant="danger">failure</Badge>}
                    {e.result === 'rolled_back' && <Badge variant="warning">rolled_back</Badge>}
                    {e.result === 'skipped' && <Badge variant="neutral">skipped</Badge>}
                    {e.result === 'pending' && <Badge variant="info">pending</Badge>}
                  </div>
                  {e.target_ref && (
                    <p className="text-xs text-slate-500">
                      Target: <code className="font-mono">{e.target_ref}</code>
                    </p>
                  )}
                  {e.detail && Object.keys(e.detail).length > 0 && (
                    <details className="rounded-md bg-mist-50 px-2 py-1 text-xs">
                      <summary className="cursor-pointer text-slate-500">detail</summary>
                      <pre className="mt-1 overflow-x-auto font-mono text-[10px] text-slate-700">
                        {JSON.stringify(e.detail, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <ProofSeal hash={e.entry_hash} compact />
                  <p className="text-xs text-slate-500">{formatDateTime(e.occurred_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
