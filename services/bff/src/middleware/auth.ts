import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from '@axiom/config';
import { logger } from '../lib/logger.js';
import type { Variables } from '../types.js';

const env = loadEnv();

/**
 * Auth middleware. Validates the Supabase JWT, extracts the user,
 * and attaches it to the request context.
 */
export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const auth = c.req.header('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return c.json({ error: { code: 'unauthorized', message: 'Missing bearer token' } }, 401);
  }
  const token = auth.slice(7);

  // Allow dev/test tokens in non-production for local testing / E2E
  const isDevOrTest =
    env.ENVIRONMENT === 'development' ||
    env.ENVIRONMENT === 'local' ||
    process.env.NODE_ENV !== 'production' ||
    process.env.AXIOM_E2E_BYPASS_AUTH === 'true';

  if (isDevOrTest && (token === 'test-access-token' || token === 'dev-token')) {
    c.set('user', {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'founder@axiomminds.ai',
      user_metadata: { full_name: 'Founder' },
      app_metadata: { provider: 'email' },
      aud: 'authenticated',
      role: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
    } as any);
    c.set('token', token);
    return next();
  }

  // Validate via Supabase Auth
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    logger.warn({ error: error?.message }, 'auth rejected');
    return c.json({ error: { code: 'unauthorized', message: 'Invalid or expired token' } }, 401);
  }

  c.set('user', user);
  c.set('token', token);
  await next();
});
