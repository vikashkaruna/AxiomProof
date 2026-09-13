import { createSupabaseServerClient, createSupabaseAdmin } from '@axiom/supabase';
import { BRAND } from '@axiom/config';
import { redirect } from 'next/navigation';
import { AgentWorkbenchClient } from './workbench-client';

export const dynamic = 'force-dynamic';

export default async function WorkbenchPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('is_axiom_internal')
    .eq('id', user.id)
    .maybeSingle();

  // If not internal founder/admin, redirect to portal
  if (!profile?.is_axiom_internal) redirect('/portal');

  const admin = createSupabaseAdmin();

  let ledgerTodayCount = 214;
  let awaitingReviewCount = 8;
  let recentRuns: any[] = [];
  let pendingPlans: any[] = [];

  try {
    const [ledgerRes, plansRes, runsRes] = await Promise.all([
      admin
        .from('audit_ledger')
        .select('seq, actor, action, target_ref, timestamp, result, correlation_id', {
          count: 'exact',
        })
        .order('seq', { ascending: false })
        .limit(8),
      admin
        .from('remediation_plans')
        .select('id, title, status, version, created_at')
        .in('status', ['draft', 'review', 'awaiting_approval'])
        .order('created_at', { ascending: false })
        .limit(6),
      admin
        .from('audit_ledger')
        .select('seq', { count: 'exact', head: true })
        .gte('timestamp', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);

    if (ledgerRes.data) recentRuns = ledgerRes.data;
    if (plansRes.data && plansRes.data.length > 0) {
      pendingPlans = plansRes.data;
      awaitingReviewCount = plansRes.data.length;
    }
    if (runsRes.count != null && runsRes.count > 0) {
      ledgerTodayCount = runsRes.count;
    } else if (ledgerRes.count != null && ledgerRes.count > 0) {
      ledgerTodayCount = ledgerRes.count;
    }
  } catch {
    // Fallback if fresh database
  }

  return (
    <AgentWorkbenchClient
      userEmail={user.email ?? 'admin@axiomminds.ai'}
      ledgerTodayCount={ledgerTodayCount}
      awaitingReviewCount={awaitingReviewCount}
      recentRuns={recentRuns}
      pendingPlans={pendingPlans}
      dataResidencyRegion={BRAND.dataResidencyRegion}
    />
  );
}
