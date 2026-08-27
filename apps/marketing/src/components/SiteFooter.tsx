import Link from 'next/link';
import { BRAND } from '@axiom/config';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-mist-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-7 w-7 rounded-md bg-indigo-500" />
              <p className="font-heading text-base font-semibold text-indigo-500">{BRAND.name}</p>
            </div>
            <p className="mt-2 max-w-md text-sm text-slate-600">{BRAND.tagline}</p>
            <p className="mt-3 text-xs text-slate-500">
              {BRAND.copyright}
              <br />
              {BRAND.jurisdiction} · {BRAND.dataResidencyRegion}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Product</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-700">
              <li>
                <Link href="/#how-it-works" className="hover:text-indigo-600">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/gap-scan" className="hover:text-indigo-600">
                  Gap-scan
                </Link>
              </li>
              <li>
                <Link href="/agents" className="hover:text-indigo-600">
                  Agents
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-indigo-600">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Company</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-700">
              <li>
                <Link href="/about" className="hover:text-indigo-600">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-indigo-600">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-indigo-600">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-indigo-600">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
