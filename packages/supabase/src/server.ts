import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { loadEnv } from '@axiom/config';
import { createE2ESupabaseClient, isE2EBypassEnabled } from './e2e';

/**
 * Create a Supabase client for use in Next.js Server Components,
 * Route Handlers, and Server Actions. Reads/writes session cookies.
 */
export async function createSupabaseServerClient() {
  const env = loadEnv();
  const cookieStore = await cookies();

  const authCookie = cookieStore
    .getAll()
    .find((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token') && c.value.length > 0);

  const isLoggedOut = cookieStore.get('axiom_e2e_logged_out')?.value === 'true';
  const userEmail = cookieStore.get('axiom_user_email')?.value || 'founder@axiomminds.ai';

  const isPreprodOrMock =
    env.ENVIRONMENT === 'preprod' ||
    env.SUPABASE_URL.includes('preprod-supabase') ||
    env.SUPABASE_URL.includes('placeholder') ||
    isE2EBypassEnabled() ||
    cookieStore.get('axiom_e2e_bypass')?.value === 'true';

  if (!isLoggedOut && isPreprodOrMock) {
    return createE2ESupabaseClient(userEmail);
  }

  if (
    !authCookie &&
    !isLoggedOut &&
    process.env.NODE_ENV === 'test' &&
    process.env.AXIOM_E2E_BYPASS_AUTH === 'true'
  ) {
    return createE2ESupabaseClient(userEmail);
  }

  const cookieName = authCookie ? authCookie.name.replace(/\.\d+$/, '') : undefined;

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookieOptions: cookieName ? { name: cookieName } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}
