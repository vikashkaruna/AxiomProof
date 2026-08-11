import type { Metadata } from 'next';
import './globals.css';
import { BRAND } from '@axiom/config';

export const metadata: Metadata = {
  title: {
    template: `%s · ${BRAND.name}`,
    default: `${BRAND.name} · ${BRAND.tagline}`,
  },
  description: BRAND.tagline,
  applicationName: BRAND.name,
  authors: [{ name: BRAND.company }],
  generator: 'Axiom Proof',
  keywords: ['DPDPA', 'compliance', 'AI agents', 'data protection', 'India'],
  referrer: 'strict-origin-when-cross-origin',
  robots: { index: false, follow: false }, // app subdomain is noindex
  metadataBase: new URL(`https://${BRAND.productDomain}`),
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title: BRAND.name,
    description: BRAND.tagline,
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-mist-100 font-body text-slate-700 antialiased">
        {children}
      </body>
    </html>
  );
}
