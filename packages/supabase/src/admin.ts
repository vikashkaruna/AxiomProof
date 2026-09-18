import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from '@axiom/config';
import { createE2ESupabaseClient, isE2EBypassEnabled } from './e2e';

let cached: SupabaseClient | null = null;

/**
 * Create a Supabase client with the service-role key. Bypasses RLS —
 * use only on the server side, only for trusted operations.
 *
 * The BFF, agent runtime, and Temporal workers use this. The Next.js
 * apps NEVER use this — they go through the user-scoped client and
 * rely on RLS to enforce tenancy.
 */
export function createSupabaseAdmin(): SupabaseClient {
  const env = loadEnv();

  // If in preprod, local, test or placeholder Supabase URL with no real DNS,
  // return deterministic E2E client to avoid 10s DNS resolution timeout
  if (
    isE2EBypassEnabled() ||
    env.ENVIRONMENT === 'preprod' ||
    env.SUPABASE_URL.includes('preprod-supabase') ||
    env.SUPABASE_URL.includes('placeholder') ||
    !env.SUPABASE_SERVICE_KEY ||
    env.SUPABASE_SERVICE_KEY === 'test-service-key-for-e2e'
  ) {
    return createE2ESupabaseClient();
  }

  if (cached) return cached;
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cached;
}
