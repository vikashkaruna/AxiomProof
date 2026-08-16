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
  single: () => Promise<{ data: typeof E2E_PLAN; error: null }>;
  then: Promise<QueryResult>['then'];
};

function createQuery(table: string): QueryBuilder {
  const result: QueryResult = {
    data: [],
    error: null,
    count: 0,
  };

  const query = {} as QueryBuilder;
  query.select = () => query;
  query.order = () => query;
  query.limit = () => query;
  query.eq = () => query;
  query.in = () => query;
  query.single = async () => ({
    data: table === 'remediation_plans' ? E2E_PLAN : E2E_PLAN,
    error: null,
  });
  query.then = Promise.resolve(result).then.bind(Promise.resolve(result));
  return query;
}

export function isE2EBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.AXIOM_E2E_BYPASS_AUTH === 'true';
}

/**
 * A deterministic, read-only Supabase facade for the local Playwright server.
 * It is only reachable through AXIOM_E2E_BYPASS_AUTH in non-production builds.
 */
export function createE2ESupabaseClient(): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: E2E_USER }, error: null }),
    },
    from: (table: string) => createQuery(table),
  } as unknown as SupabaseClient;
}
