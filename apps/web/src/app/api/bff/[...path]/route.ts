import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@axiom/supabase';

type RouteContext = { params: Promise<{ path: string[] }> };

/** Browser-to-BFF bridge: cookies stay server-side; the BFF receives a bearer token. */
async function forward(request: NextRequest, context: RouteContext) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let accessToken = session?.access_token;
  if (!accessToken) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (
      user ||
      (process.env.NODE_ENV === 'test' &&
        (process.env.AXIOM_E2E_BYPASS_AUTH === 'true' ||
          request.headers.get('x-e2e-bypass-auth') === 'true'))
    ) {
      accessToken = 'test-access-token';
    }
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Missing session' } },
      { status: 401 },
    );
  }

  const { path } = await context.params;
  const base = process.env.BFF_PUBLIC_URL || 'http://localhost:4000';
  const target = new URL(`${base.replace(/\/$/, '')}/${path.join('/')}`);
  target.search = request.nextUrl.search;
  const headers = new Headers(request.headers);
  headers.set('authorization', `Bearer ${accessToken}`);
  if (!headers.has('x-tenant-id')) {
    const activeTenantSlug = request.cookies.get('axiom_active_tenant')?.value;
    const tenantMap: Record<string, string> = {
      meridian: '00000000-0000-0000-0000-000000000001',
      aarogya: '00000000-0000-0000-0000-000000000002',
      streamline: '00000000-0000-0000-0000-000000000003',
    };
    const tenantId =
      (activeTenantSlug && tenantMap[activeTenantSlug]) ||
      (activeTenantSlug &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeTenantSlug)
        ? activeTenantSlug
        : '00000000-0000-0000-0000-000000000001');
    headers.set('x-tenant-id', tenantId);
  }
  headers.delete('host');
  headers.delete('content-length');
  headers.delete('cookie');
  const body =
    request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer();
  const response = await fetch(target, {
    method: request.method,
    headers,
    body,
    redirect: 'manual',
  });
  return new NextResponse(response.body, { status: response.status, headers: response.headers });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
