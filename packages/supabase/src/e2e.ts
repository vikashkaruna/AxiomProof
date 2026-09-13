import type { SupabaseClient, User } from '@supabase/supabase-js';

const E2E_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'founder@axiomminds.ai',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2026-01-01T00:00:00.000Z',
  last_sign_in_at: '2026-01-01T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Founder' },
  identities: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const E2E_PLAN = {
  id: '00000000-0000-0000-0000-000000000001',
  title: 'E2E remediation plan',
  description: 'A deterministic plan fixture for browser tests.',
  status: 'draft',
  version: 1,
  library_version: '0.1.0',
  created_at: '2026-01-01T00:00:00.000Z',
  tenant_id: '00000000-0000-0000-0000-000000000002',
  engagement_id: '00000000-0000-0000-0000-000000000003',
  aggregate_blast_radius: { recordsAffected: 0, systemsAffected: [] },
  remediation_actions: [],
  tenants: { id: '00000000-0000-0000-0000-000000000002', name: 'E2E tenant', slug: 'e2e' },
};

const E2E_USER_PROFILE = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'founder@axiomminds.ai',
  full_name: 'Founder',
  is_axiom_internal: true,
};

const E2E_TENANT = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Demo Client (Acme Fintech Pvt Ltd)',
  slug: 'demo-client',
  tier: 'growth',
  is_sdf: false,
};

const E2E_LEDGER_ENTRY = {
  id: '1',
  sequence_no: 1,
  actor_type: 'agent',
  actor_id: 'drishti',
  action_type: 'discovery.started',
  result: 'success',
  target_ref: '00000000-0000-0000-0000-000000000001',
  detail: { summary: 'Initial system discovery completed' },
  entry_hash: '6fae688e4b150dbbaa49eaf57359a53879fd6be0893a74a8f7700461cc9a206b',
  prev_entry_hash: null,
  occurred_at: '2026-09-11T19:13:30.546Z',
};

type QueryResult = {
  data: unknown[];
  error: null;
  count: number;
};

type QueryBuilder = {
  select: (...args: unknown[]) => QueryBuilder;
  order: (...args: unknown[]) => QueryBuilder;
  limit: (...args: unknown[]) => QueryBuilder;
  eq: (...args: unknown[]) => QueryBuilder;
  in: (...args: unknown[]) => QueryBuilder;
  insert: (...args: unknown[]) => QueryBuilder;
  upsert: (...args: unknown[]) => QueryBuilder;
  update: (...args: unknown[]) => QueryBuilder;
  delete: (...args: unknown[]) => QueryBuilder;
  single: () => Promise<{ data: unknown; error: null }>;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
  then: Promise<QueryResult>['then'];
};

function createQuery(table: string): QueryBuilder {
  let mutatedData: unknown = null;
  const resultData =
    table === 'users'
      ? [E2E_USER_PROFILE]
      : table === 'remediation_plans'
        ? [E2E_PLAN]
        : table === 'tenants'
          ? [E2E_TENANT]
          : table === 'audit_ledger'
            ? [E2E_LEDGER_ENTRY]
            : [];
  const singleData =
    table === 'users'
      ? E2E_USER_PROFILE
      : table === 'remediation_plans'
        ? E2E_PLAN
        : table === 'tenants'
          ? E2E_TENANT
          : table === 'audit_ledger'
            ? E2E_LEDGER_ENTRY
            : { id: '00000000-0000-0000-0000-000000000001' };

  const result: QueryResult = {
    data: resultData,
    error: null,
    count: resultData.length,
  };

  const query = {} as QueryBuilder;
  query.select = () => query;
  query.order = () => query;
  query.limit = () => query;
  query.eq = () => query;
  query.in = () => query;
  query.insert = (values: unknown) => {
    mutatedData = Array.isArray(values) ? values[0] : values;
    return query;
  };
  query.upsert = (values: unknown) => {
    mutatedData = Array.isArray(values) ? values[0] : values;
    return query;
  };
  query.update = (values: unknown) => {
    mutatedData = values;
    return query;
  };
  query.delete = () => query;
  query.single = async () => ({
    data:
      mutatedData && typeof mutatedData === 'object'
        ? { id: '00000000-0000-0000-0000-000000000001', ...(mutatedData as Record<string, unknown>) }
        : singleData,
    error: null,
  });
  query.maybeSingle = async () => ({
    data:
      mutatedData && typeof mutatedData === 'object'
        ? { id: '00000000-0000-0000-0000-000000000001', ...(mutatedData as Record<string, unknown>) }
        : singleData,
    error: null,
  });
  query.then = Promise.resolve(result).then.bind(Promise.resolve(result));
  return query;
}

export function isE2EBypassEnabled(): boolean {
  return (
    (process.env.NODE_ENV !== 'production' ||
      process.env.ENVIRONMENT === 'development' ||
      process.env.ENVIRONMENT === 'local') &&
    process.env.AXIOM_E2E_BYPASS_AUTH === 'true'
  );
}

/**
 * A deterministic, read-only Supabase facade for the local Playwright server.
 * It is only reachable through AXIOM_E2E_BYPASS_AUTH in non-production builds.
 */
export function createE2ESupabaseClient(): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: E2E_USER }, error: null }),
      getSession: async () => ({
        data: {
          session: {
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            user: E2E_USER,
          },
        },
        error: null,
      }),
    },
    from: (table: string) => createQuery(table),
    rpc: async (_fn: string, _args?: unknown) => ({ data: [], error: null }),
  } as unknown as SupabaseClient;
}
