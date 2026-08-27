import Link from 'next/link';
import { BRAND } from '@axiom/config';
import { Button } from '@axiom/ui';

export function SiteHeader() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-7 w-7 rounded-md bg-indigo-500" />
          <div>
            <p className="font-heading text-base font-semibold text-indigo-500">{BRAND.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {BRAND.jurisdiction} · {BRAND.dataResidencyRegion}
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/#how-it-works"
            className="hidden text-sm text-slate-700 hover:text-indigo-500 sm:inline"
          >
            How it works
          </Link>
          <Link
            href="/agents"
            className="hidden text-sm text-slate-700 hover:text-indigo-500 sm:inline"
          >
            Agents
          </Link>
          <Link
            href="/pricing"
            className="hidden text-sm text-slate-700 hover:text-indigo-500 sm:inline"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className="hidden text-sm text-slate-700 hover:text-indigo-500 sm:inline"
          >
            About
          </Link>
          <Button variant="ghost" size="sm" asChild={false}>
            <Link href={`${appUrl}/login`}>Sign in</Link>
          </Button>
          <Button variant="accent" size="sm" asChild={false}>
            <Link href="/gap-scan">Free gap-scan</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
