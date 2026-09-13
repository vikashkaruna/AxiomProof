import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@axiom/supabase';

type RouteContext = { params: Promise<{ path: string[] }> };

/** Browser-to-BFF bridge: cookies stay server-side; the BFF receives a bearer token. */
async function forward(request: NextRequest, context: RouteContext) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ error: { code: 'unauthorized' } }, { status: 401 });
  }

  const { path } = await context.params;
  const base = process.env.BFF_PUBLIC_URL || 'http://localhost:4000';
  const target = new URL(`${base.replace(/\/$/, '')}/${path.join('/')}`);
  target.search = request.nextUrl.search;
  const headers = new Headers(request.headers);
  headers.set('authorization', `Bearer ${session.access_token}`);
  if (!headers.has('x-tenant-id')) {
    headers.set('x-tenant-id', '00000000-0000-0000-0000-000000000001');
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
