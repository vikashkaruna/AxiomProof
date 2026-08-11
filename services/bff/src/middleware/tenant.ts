import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from '@axiom/config';
import { logger } from '../lib/logger.js';
import type { Variables } from '../types.js';
import type { UserRole } from '@axiom/types';

const env = loadEnv();

/**
 * Tenant resolver. Reads X-Tenant-Id header, validates the user is a
 * member of that tenant, and attaches the membership (with role) to
 * the request context. The actual data access uses the user's JWT,
 * so RLS still applies.
 */
export const tenantResolver = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const tenantId = c.req.header('x-tenant-id');
  if (!tenantId) {
    return c.json(
      { error: { code: 'tenant_required', message: 'X-Tenant-Id header is required' } },
      400,
    );
  }
  const user = c.get('user');
  const token = c.get('token');

  // Verify membership using the user's own JWT (RLS does the work)
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: membership, error } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single();

  if (error || !membership) {
    logger.warn(
      { userId: user.id, tenantId, error: error?.message },
      'tenant access denied',
    );
    return c.json(
      { error: { code: 'tenant_forbidden', message: 'Not a member of this tenant' } },
      403,
    );
  }

  c.set('tenantId', tenantId);
  c.set('role', membership.role as UserRole);
  await next();
});
