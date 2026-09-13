'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AxiomLogo } from '@axiom/ui';
import { SidebarAgentPanel } from './sidebar-agent-panel';

export interface NavItem {
  route: string;
  en: string;
  hi: string;
  phase: string;
  star?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const APP_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ route: '/dashboard', en: 'Dashboard', hi: 'डैशबोर्ड', phase: 'P0' }],
  },
  {
    label: 'Discover & Classify · Drishti + Vibhaag',
    items: [
      { route: '/discovery', en: 'Data Discovery', hi: 'डेटा खोज', phase: 'P1' },
      { route: '/classification', en: 'Classification', hi: 'वर्गीकरण', phase: 'P1' },
      { route: '/datamap', en: 'Data Map & RoPA', hi: 'डेटा मानचित्र', phase: 'P1' },
    ],
  },
  {
    label: 'Assess · Parikshan',
    items: [
      { route: '/assessment', en: 'Assessment', hi: 'मूल्यांकन', phase: 'P0' },
      { route: '/controls', en: 'Control Library', hi: 'नियंत्रण संग्रह', phase: 'P0' },
    ],
  },
  {
    label: 'Remediate · Sudhaar + Karya',
    items: [
      { route: '/plans', en: 'Remediation Plans', hi: 'सुधार योजना', phase: 'P3' },
      { route: '/approval', en: 'Approval Console', hi: 'अनुमोदन कंसोल', phase: 'P3', star: true },
      { route: '/execution', en: 'Execution & Rollback', hi: 'निष्पादन', phase: 'P3' },
    ],
  },
  {
    label: 'Evidence & Audit · Saakshi + Lekha',
    items: [
      { route: '/evidence', en: 'Evidence Explorer', hi: 'साक्ष्य', phase: 'P2' },
      { route: '/ledger', en: 'Audit Ledger', hi: 'अंकेक्षण बही', phase: 'P2' },
    ],
  },
  {
    label: 'Rights & Consent',
    items: [
      { route: '/dsars', en: 'DSAR / Rights', hi: 'अधिकार अनुरोध', phase: 'P3' },
      { route: '/consent', en: 'Consent Manager', hi: 'सहमति प्रबंधन', phase: 'P3' },
    ],
  },
  {
    label: 'Incident',
    items: [{ route: '/breaches', en: 'Breach & Incident', hi: 'उल्लंघन', phase: 'P3' }],
  },
  {
    label: 'Monitor · Nazar',
    items: [
      { route: '/monitoring', en: 'Continuous Monitoring', hi: 'सतत निगरानी', phase: 'P3' },
      { route: '/regwatch', en: 'Regulatory Watch', hi: 'नियामक निगरानी', phase: 'P2' },
    ],
  },
  {
    label: 'Report · Prativedan',
    items: [{ route: '/reports', en: 'Reports', hi: 'रिपोर्ट', phase: 'P2' }],
  },
  {
    label: 'Operate',
    items: [
      { route: '/workbench', en: 'Agent Workbench', hi: 'एजेंट कार्यक्षेत्र', phase: 'P0' },
      { route: '/partner', en: 'Partner Portal', hi: 'भागीदार पोर्टल', phase: 'P4' },
      { route: '/connectors', en: 'Connectors', hi: 'कनेक्टर', phase: 'P2' },
      { route: '/policies', en: 'Standing Policies', hi: 'स्थायी नीतियाँ', phase: 'P4' },
      { route: '/settings', en: 'Settings', hi: 'सेटिंग्स', phase: 'P0' },
    ],
  },
];

export interface TenantOption {
  id: string;
  name: string;
  slug?: string;
  sector: string;
  mark: string;
  color: string;
  employees: number;
  score: number;
  env: string;
}

export const DEFAULT_TENANTS: TenantOption[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Meridian Pay',
    slug: 'meridian',
    sector: 'Fintech',
    mark: 'MP',
    color: '#1E2A4A',
    employees: 420,
    score: 74,
    env: 'Production',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Aarogya Health',
    slug: 'aarogya',
    sector: 'Healthcare',
    mark: 'AH',
    color: '#0FB5A5',
    employees: 680,
    score: 61,
    env: 'Production',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Streamline SaaS',
    slug: 'streamline',
    sector: 'B2B SaaS',
    mark: 'SS',
    color: '#C9A227',
    employees: 210,
    score: 83,
    env: 'Staging',
  },
];

function setActiveTenantCookie(slug: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `axiom_active_tenant=${slug}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

interface AppShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    email?: string;
    user_metadata?: { full_name?: string };
  };
  tenants: Array<{ id: string; name: string; slug: string; role: string }>;
  activeTenantSlug?: string;
  logoutAction: () => Promise<void>;
}

export function AppShell({
  children,
  user,
  tenants,
  activeTenantSlug,
  logoutAction,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [killOn, setKillOn] = useState(false);
  const [tenantsOpen, setTenantsOpen] = useState(false);

  // Active tenant resolution: activeTenantSlug cookie > user tenants > default tenants
  const matchedFromSlug = activeTenantSlug
    ? DEFAULT_TENANTS.find(
        (t) =>
          t.slug === activeTenantSlug ||
          t.id === activeTenantSlug ||
          (activeTenantSlug === 'meridian' && t.id === '00000000-0000-0000-0000-000000000001') ||
          (activeTenantSlug === 'demo-client' && t.id === '00000000-0000-0000-0000-000000000001'),
      ) ||
      tenants
        .filter((t) => t.slug === activeTenantSlug || t.id === activeTenantSlug)
        .map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          sector: 'Enterprise',
          mark: t.name.slice(0, 2).toUpperCase(),
          color: '#1E2A4A',
          employees: 500,
          score: 74,
          env: 'Production',
        }))[0]
    : undefined;

  const initialTenant: TenantOption =
    matchedFromSlug ||
    (tenants.length > 0 && tenants[0]
      ? {
          id: tenants[0].id,
          name: tenants[0].name,
          slug: tenants[0].slug,
          sector: 'Enterprise',
          mark: tenants[0].name.slice(0, 2).toUpperCase(),
          color: '#1E2A4A',
          employees: 500,
          score: 74,
          env: 'Production',
        }
      : DEFAULT_TENANTS[0]!);

  const [selectedTenant, setSelectedTenant] = useState<TenantOption>(initialTenant);

  const handleSelectTenant = (t: TenantOption) => {
    setSelectedTenant(t);
    setTenantsOpen(false);
    const targetSlug = t.slug || t.id;
    setActiveTenantCookie(targetSlug);
    if (pathname === '/portal') {
      router.push(`/portal?tenant=${targetSlug}`);
    } else {
      router.refresh();
    }
  };

  // Find active group and item for breadcrumb
  let activeBreadcrumb = 'Overview';
  let activeTitle = 'Dashboard';

  for (const group of APP_NAV_GROUPS) {
    for (const item of group.items) {
      if (
        pathname === item.route ||
        (item.route !== '/dashboard' && pathname.startsWith(item.route))
      ) {
        activeBreadcrumb = group.label;
        activeTitle = item.en;
        break;
      }
    }
  }

  const scoreColor = (s: number) => (s >= 80 ? '#0FB5A5' : s >= 70 ? '#E0A82E' : '#D9534F');

  return (
    <div className="flex min-h-screen bg-[#F4F6F8]">
      {/* ============ SIDEBAR ============ */}
      <aside className="sticky top-0 z-30 flex h-screen w-[266px] shrink-0 flex-col bg-[#1E2A4A] text-[#c7cfe0] border-r border-white/10">
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center px-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-3">
            <AxiomLogo size="md" theme="dark" showSubtitle={true} />
          </Link>
        </div>

        {/* Navigation Stream */}
        <div className="flex-1 overflow-y-auto py-2">
          {APP_NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-1">
              <div className="px-5 pt-3.5 pb-1 text-[9.5px] font-semibold tracking-[0.08em] uppercase text-[#6f7ba0]">
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.route ||
                  (item.route !== '/dashboard' && pathname.startsWith(item.route));

                return (
                  <Link
                    key={item.route}
                    href={item.route}
                    className={`flex items-center gap-2.5 px-5 py-1.5 transition-colors ${
                      isActive
                        ? 'border-l-[3px] border-[#0FB5A5] bg-[#0FB5A5]/10 text-white font-semibold'
                        : 'border-l-[3px] border-transparent text-[#c7cfe0] hover:bg-white/5'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        isActive ? 'bg-[#0FB5A5]' : 'bg-[#3d4863]'
                      }`}
                    />
                    <span className="flex flex-1 items-center gap-1.5 text-[13px] truncate">
                      <span className={isActive ? 'text-white' : 'text-[#c7cfe0]'}>{item.en}</span>
                      <span className="font-heading text-[10.5px] text-[#6f7ba0] font-normal">
                        {item.hi}
                      </span>
                    </span>
                    {item.star && <span className="text-[#C9A227] text-xs">★</span>}
                    <span
                      className={`text-[8.5px] font-semibold tracking-wider px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-[#8a97b8]'
                      }`}
                    >
                      {item.phase}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Profile Bar */}
        <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-3 bg-[#182238]/60">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C9A227] font-heading text-xs font-bold text-[#1E2A4A]">
            {(user.user_metadata?.full_name ?? user.email ?? 'P')[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-white">
              {user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Priya Nair'}
            </div>
            <div className="text-[10px] text-[#6f7ba0]">Compliance Head · Approver</div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="text-[11px] text-[#8a909b] hover:text-white transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* Bespoke 10-Agent Panel (Preserved!) */}
        <SidebarAgentPanel />
      </aside>

      {/* ============ MAIN AREA ============ */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center gap-4 border-b border-[#e4e8ee] bg-white px-6">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-[#8a909b] truncate">{activeBreadcrumb}</div>
            <h1 className="font-heading text-[17px] font-semibold leading-tight text-[#1E2A4A] truncate">
              {activeTitle}
            </h1>
          </div>

          {/* Tenant Switcher */}
          <div className="relative">
            <div
              onClick={() => setTenantsOpen(!tenantsOpen)}
              className="flex items-center gap-2.5 rounded-lg border border-[#e4e8ee] bg-white px-3 py-1.5 cursor-pointer shadow-sm hover:border-[#0FB5A5] transition-colors"
            >
              <span
                style={{ backgroundColor: selectedTenant.color }}
                className="flex h-6 w-6 items-center justify-center rounded-md font-heading text-[11px] font-bold text-white"
              >
                {selectedTenant.mark}
              </span>
              <div className="leading-tight text-left">
                <div className="text-xs font-semibold text-[#2F3542]">{selectedTenant.name}</div>
                <div className="text-[10px] text-[#8a909b]">{selectedTenant.sector}</div>
              </div>
              <span className="text-[10px] text-[#8a909b] ml-1">▾</span>
            </div>

            {tenantsOpen && (
              <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-[#e4e8ee] bg-white p-1.5 shadow-xl">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8a909b]">
                  Switch client · demo tenants
                </div>
                {DEFAULT_TENANTS.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTenant(t)}
                    className={`flex items-center gap-2.5 rounded-lg p-2 cursor-pointer transition-colors ${
                      t.id === selectedTenant.id ? 'bg-[#F4F6F8]' : 'hover:bg-[#F4F6F8]'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: t.color }}
                      className="flex h-7 w-7 items-center justify-center rounded-md font-heading text-xs font-bold text-white"
                    >
                      {t.mark}
                    </span>
                    <div className="flex-1 text-left">
                      <div className="text-xs font-semibold text-[#2F3542]">{t.name}</div>
                      <div className="text-[10.5px] text-[#8a909b]">
                        {t.sector} · {t.employees} employees
                      </div>
                    </div>
                    <span
                      style={{ color: scoreColor(t.score) }}
                      className="text-xs font-bold font-mono"
                    >
                      {t.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Environment Indicator */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[#e4e8ee] bg-white px-2.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0FB5A5] animate-pulse" />
            <span className="text-xs font-medium text-[#5b6270]">{selectedTenant.env}</span>
          </div>

          {/* Kill Switch Toggle */}
          <button
            onClick={() => setKillOn(!killOn)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              killOn
                ? 'border-[#D9534F] bg-[#D9534F] text-white shadow-sm'
                : 'border-[#e4e8ee] bg-white text-[#D9534F] hover:bg-[#FCEEEC]'
            }`}
            title="Global kill switch for autonomous agents"
          >
            <span>⏻</span> Kill switch
          </button>
        </header>

        {/* Global Kill Switch Alert Banner */}
        {killOn && (
          <div className="flex items-center justify-between bg-[#D9534F] px-6 py-2.5 text-xs font-semibold text-white shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-sm">⏻</span>
              <span>KILL SWITCH ENGAGED — all in-flight agent execution halted globally.</span>
            </div>
            <button
              onClick={() => setKillOn(false)}
              className="font-normal underline hover:text-white/80"
            >
              Disengage
            </button>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
