import Link from 'next/link';
import { BRAND } from '@axiom/config';
import { Button, Card, CardContent } from '@axiom/ui';
import { ContactForm } from './contact-form';

export const metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-indigo-500">
        Talk to the founder
      </h1>
      <p className="mt-3 text-lg text-slate-600">
        No sales team. No SDR. You'll talk to {BRAND.company}'s founder directly.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardContent className="p-6">
              <ContactForm />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent className="flex flex-col gap-3 p-6">
              <p className="font-medium text-slate-700">Direct</p>
              <p className="text-sm text-slate-600">
                <a href={`mailto:${BRAND.contactEmail}`} className="text-teal-600 hover:underline">
                  {BRAND.contactEmail}
                </a>
              </p>
              <p className="font-medium text-slate-700">Privacy inquiries</p>
              <p className="text-sm text-slate-600">
                <a href={`mailto:${BRAND.privacyEmail}`} className="text-teal-600 hover:underline">
                  {BRAND.privacyEmail}
                </a>
              </p>
              <p className="font-medium text-slate-700">Or run the free gap-scan first</p>
              <Button asChild={false} variant="outline" size="sm">
                <Link href="/#gap-scan">5-min gap-scan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
