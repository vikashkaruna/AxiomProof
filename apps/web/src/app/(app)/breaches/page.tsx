import { redirect } from 'next/navigation';
import { createSupabaseServerClient, createSupabaseAdmin } from '@axiom/supabase';
import { BreachClient, type BreachItem } from './breach-client';

export const dynamic = 'force-dynamic';

export default async function BreachesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createSupabaseAdmin();
  let breachItem: BreachItem | null = null;

  try {
    const { data: dbBreaches } = await admin
      .from('breaches')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(1);

    if (dbBreaches && dbBreaches.length > 0) {
      const b = dbBreaches[0];
      breachItem = {
        id: b.id,
        title: b.title,
        description: b.description,
        severity: b.severity,
        status: b.status,
        detectedAt: b.detected_at,
        dueAt: b.dpb_notification_due_by,
        affectedCount: b.affected_count || 2100,
        dataCategories: b.data_categories || ['PAN', 'contact'],
      };
    }
  } catch {
    // Fallback
  }

  return <BreachClient initialBreach={breachItem} />;
}
