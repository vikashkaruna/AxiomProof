import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdmin } from '@axiom/supabase';
import { PageHeader, Card, CardContent, Badge, ProofSeal, AgentPill } from '@axiom/ui';
import { formatDateTime, relativeTime, truncateHash } from '@axiom/ui';
import type { AgentName } from '@axiom/design-tokens';
import { VerifyButton } from './verify-button';
import { LedgerRefresh } from './ledger-refresh';

export const dynamic = 'force-dynamic';

interface LedgerVerification {
  intact: boolean;
  firstBreak?: { sequence_no?: number } | null;
}

interface RunningAgent {
  id: string;
  agent: AgentName;
  actionType: string;
  startedAt: string;
  correlationId: string;
  targetRef?: string | null;
  status: 'running' | 'queued';
  source: 'agent_runs' | 'audit_ledger';
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
  const tenantId = tenants?.[0]?.id;

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

  // Fetch active agent runs and audit ledger entries in parallel
  const [activeRunsRes, ledgerRes] = await Promise.all([
    admin
      .from('agent_runs')
      .select('*')
      .in('status', ['running', 'queued'])
      .order('started_at', { ascending: false }),
    admin
      .from('audit_ledger')
      .select('*')
      .order('sequence_no', { ascending: false })
      .limit(50),
  ]);

  const activeAgentRuns = activeRunsRes.data ?? [];
  const entries = ledgerRes.data ?? [];

  // Correlate terminal vs started entries across the ledger
  const terminalResults = new Set(['success', 'failure', 'rolled_back', 'skipped']);
  const completedByCorrelation = new Map<
    string,
    { sequence_no: number; result: string; occurred_at: string }
  >();

  for (const e of entries) {
    if (e.correlation_id && terminalResults.has(e.result)) {
      if (!completedByCorrelation.has(e.correlation_id)) {
        completedByCorrelation.set(e.correlation_id, {
          sequence_no: e.sequence_no,
          result: e.result,
          occurred_at: e.occurred_at,
        });
      }
    }
  }

  // Build list of all actively running agents
  const runningAgentsMap = new Map<string, RunningAgent>();

  // 1. From agent_runs table
  for (const run of activeAgentRuns) {
    if (run.correlation_id) {
      runningAgentsMap.set(run.correlation_id, {
        id: run.id,
        agent: run.agent as AgentName,
        actionType: `${run.agent}.executing`,
        startedAt: run.started_at,
        correlationId: run.correlation_id,
        targetRef: run.engagement_id,
        status: run.status as 'running' | 'queued',
        source: 'agent_runs',
      });
    }
  }

  // 2. From audit_ledger pending entries without completion
  for (const e of entries) {
    if (e.actor_type === 'agent' && e.result === 'pending' && e.correlation_id) {
      const isCompleted = completedByCorrelation.has(e.correlation_id);
      if (!isCompleted && !runningAgentsMap.has(e.correlation_id)) {
        runningAgentsMap.set(e.correlation_id, {
          id: String(e.id),
          agent: e.actor_id as AgentName,
          actionType: e.action_type,
          startedAt: e.occurred_at,
          correlationId: e.correlation_id,
          targetRef: e.target_ref,
          status: 'running',
          source: 'audit_ledger',
        });
      }
    }
  }

  const runningAgents = Array.from(runningAgentsMap.values());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit ledger"
        description="Append-only, hash-chained, tamper-evident. Every agent action, every human approval, every state change — recorded in the order it happened, with a verifiable chain."
        actions={
          <div className="flex items-center gap-3">
            <LedgerRefresh runningCount={runningAgents.length} />
            <VerifyButton tenantId={tenantId} />
          </div>
        }
        meta={
          <>
            {verification.intact ? (
              <Badge variant="success">Chain intact</Badge>
            ) : (
              <Badge variant="danger">
                Chain break at sequence {verification.firstBreak?.sequence_no}
              </Badge>
            )}
            {runningAgents.length > 0 ? (
              <Badge
                variant="info"
                className="flex items-center gap-1.5 border border-teal-300 bg-teal-50 text-teal-800 font-medium"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                </span>
                {runningAgents.length} {runningAgents.length === 1 ? 'agent running' : 'agents running'}
              </Badge>
            ) : (
              <Badge variant="neutral">Agents idle</Badge>
            )}
          </>
        }
      />

      {/* Active Agent Executions Banner */}
      {runningAgents.length > 0 && (
        <Card className="border-teal-300 bg-teal-50/40 shadow-xs overflow-hidden">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500" />
                </span>
                <h3 className="font-heading text-sm font-semibold text-teal-950">
                  Active agent executions ({runningAgents.length})
                </h3>
              </div>
              <span className="text-xs text-teal-700 font-medium">
                Live stream · auto-refreshing
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Agents currently performing compliance actions against target systems. Realtime state updates stream to the tamper-evident ledger upon task finalization.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              {runningAgents.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-2 rounded-lg border border-teal-200 bg-white p-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AgentPill agent={a.agent} showPersona={true} />
                      <code className="rounded bg-mist-100 px-1.5 py-0.5 font-mono text-[11px] text-indigo-700">
                        {a.actionType}
                      </code>
                    </div>
                    <Badge variant="info" className="flex items-center gap-1 animate-pulse text-[10px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                      Running
                    </Badge>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-teal-100">
                    <div className="h-full bg-teal-500 animate-pulse w-3/4 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Started {relativeTime(a.startedAt)}</span>
                    {a.targetRef && (
                      <span className="truncate max-w-[140px]" title={a.targetRef}>
                        Target: <code className="font-mono text-[10px]">{a.targetRef}</code>
                      </span>
                    )}
                    <span className="font-mono text-[10px]">
                      {truncateHash(a.correlationId)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ledger Records Table */}
      <div className="grid grid-cols-1 gap-3">
        {entries.map((e) => {
          const completed = e.correlation_id ? completedByCorrelation.get(e.correlation_id) : null;
          return (
            <Card key={e.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
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

                      {/* Explicit & Appropriate Status Representation */}
                      {e.result === 'success' && <Badge variant="success">success</Badge>}
                      {e.result === 'failure' && <Badge variant="danger">failure</Badge>}
                      {e.result === 'rolled_back' && <Badge variant="warning">rolled_back</Badge>}
                      {e.result === 'skipped' && <Badge variant="neutral">skipped</Badge>}
                      {e.result === 'pending' && (
                        completed ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Badge variant="neutral">started</Badge>
                            <span className="text-[11px] text-slate-500 font-mono">
                              completed in #{completed.sequence_no} ({completed.result})
                            </span>
                          </span>
                        ) : (
                          <Badge variant="info" className="flex items-center gap-1.5 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-ping" />
                            running
                          </Badge>
                        )
                      )}
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
          );
        })}
      </div>
    </div>
  );
}
