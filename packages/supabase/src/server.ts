import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { loadEnv } from '@axiom/config';
import { createE2ESupabaseClient, isE2EBypassEnabled } from './e2e';

/**
 * Create a Supabase client for use in Next.js Server Components,
 * Route Handlers, and Server Actions. Reads/writes session cookies.
 */
export function createSupabaseServerClient() {
  if (isE2EBypassEnabled()) return createE2ESupabaseClient();

  const env = loadEnv();
  const cookieStore = cookies();

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Same as above
        }
      },
    },
  });
}
