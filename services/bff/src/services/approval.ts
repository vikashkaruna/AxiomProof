import { ApprovalEngine } from '@axiom/approval-engine';
import { loadEnv } from '@axiom/config';
import { createClient } from '@supabase/supabase-js';

export { ApprovalEngine };

/**
 * Construct an ApprovalEngine, loading per-tenant signing secrets
 * from Supabase. The default secret is a dev fallback; in production,
 * each tenant has its own secret stored in the secrets table.
 */
export function createApprovalEngine(env: ReturnType<typeof loadEnv>) {
  const engine = new ApprovalEngine(
    env.APPROVAL_SIGNING_KEY ? Buffer.from(env.APPROVAL_SIGNING_KEY, 'utf-8') : undefined,
  );

  // Load per-tenant secrets
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // In production, we'd load these from AWS Secrets Manager.
  // For Phase 0/1, we use a per-tenant secret in a `tenant_secrets` table.
  // (That table is created in a future migration; for now, all tenants
  // share the default secret in dev / use a per-tenant config in staging+.)
  void (async () => {
    try {
      const { data } = await supabase.from('tenants').select('id, slug');
      if (!data) return;
      for (const t of data) {
        const perTenantKey = process.env[`APPROVAL_KEY_${t.slug.toUpperCase().replace(/-/g, '_')}`];
        if (perTenantKey) {
          engine.setTenantSecret(t.id, perTenantKey);
        }
      }
    } catch {
      // best-effort
    }
  })();

  return engine;
}
