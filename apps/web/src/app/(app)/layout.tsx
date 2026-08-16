import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@axiom/supabase';
import { BRAND } from '@axiom/config';
import { AgentPill } from '@axiom/ui';
import type { User } from '@supabase/supabase-js';
import { logoutAction } from '../(auth)/login/actions';

export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/workbench', label: 'Workbench', group: 'internal' },
  { href: '/portal', label: 'Client Portal', group: 'client' },
  { href: '/engagements', label: 'Engagements', group: 'shared' },
  { href: '/plans', label: 'Remediation Plans', group: 'shared' },
  { href: '/evidence', label: 'Evidence Explorer', group: 'shared' },
  { href: '/controls', label: 'Control Library', group: 'shared' },
  { href: '/breaches', label: 'Breach Ops', group: 'shared' },
  { href: '/dsars', label: 'DSARs', group: 'shared' },
  { href: '/ledger', label: 'Audit Ledger', group: 'internal' },
  { href: '/settings', label: 'Settings', group: 'shared' },
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Tenant membership + role
  const { data: memberships } = await supabase
    .from('tenant_users')
    .select('tenant_id, role, tenants:tenant_id(slug, name)')
    .eq('user_id', user.id);

  const tenants = (memberships ?? []).map((m: any) => ({
    id: m.tenant_id,
    role: m.role,
    name: m.tenants?.name ?? 'Unknown',
    slug: m.tenants?.slug ?? '',
  }));

  return (
    <div className="flex min-h-screen bg-mist-100">
      <Sidebar tenants={tenants} user={user} />
      <div className="flex flex-1 flex-col">
        <TopBar user={user} tenants={tenants} />
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-8xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  tenants,
  user,
}: {
  tenants: Array<{ id: string; name: string; slug: string; role: string }>;
  user: User;
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-slate-200 px-4">
        <Link href="/workbench" className="flex items-center gap-2">
          <span className="inline-block h-7 w-7 rounded-md bg-indigo-500" />
          <div>
            <p className="font-heading text-sm font-semibold text-indigo-500">{BRAND.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {BRAND.jurisdiction} · {BRAND.dataResidencyRegion}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-mist-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Agents</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {(['drishti', 'vibhaag', 'parikshan', 'saakshi', 'sudhaar', 'lekha'] as const).map(
            (a) => (
              <AgentPill key={a} agent={a} showPersona={false} />
            ),
          )}
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  user,
  tenants,
}: {
  user: User;
  tenants: Array<{ id: string; name: string; slug: string; role: string }>;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        {tenants.length > 0 && (
          <div className="text-sm">
            <span className="text-slate-500">Tenant:</span>{' '}
            <span className="font-medium text-indigo-500">{tenants[0]?.name}</span>
            <span className="ml-2 rounded-full bg-mist-200 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {tenants[0]?.role}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-700">
            {user.user_metadata?.full_name ?? user.email}
          </p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-mist-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
