import type { Metadata } from 'next';
import './globals.css';
import { BRAND } from '@axiom/config';

export const metadata: Metadata = {
  metadataBase: new URL(`https://${BRAND.primaryDomain}`),
  title: {
    template: `%s · ${BRAND.name}`,
    default: `${BRAND.name} — ${BRAND.tagline}`,
  },
  description:
    'Axiom Proof is the agentic DPDPA compliance platform for Indian mid-market enterprises. AI agents discover your personal data, assess your gaps, and — after you approve — execute the fix. Every action is sealed into a verifiable audit trail.',
  applicationName: BRAND.name,
  authors: [{ name: BRAND.company }],
  generator: 'Axiom Proof',
  keywords: [
    'DPDPA', 'DPDP Act', 'compliance', 'India', 'data protection',
    'AI agents', 'audit trail', 'privacy', 'agentic', 'mid-market',
  ],
  referrer: 'strict-origin-when-cross-origin',
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title: BRAND.name,
    description: 'Agents do the work. You approve. The proof is automatic.',
    locale: 'en_IN',
    url: `https://${BRAND.primaryDomain}`,
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND.name,
    description: 'Agents do the work. You approve. The proof is automatic.',
  },
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className="h-full">
      <body className="min-h-full bg-white font-body text-slate-700 antialiased">
        {children}
      </body>
    </html>
  );
}
