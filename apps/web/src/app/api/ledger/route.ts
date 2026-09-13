import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@axiom/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = createSupabaseAdmin();

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '25', 10)));
    const agent = searchParams.get('agent');
    const action = searchParams.get('action');
    const result = searchParams.get('result');
    const q = searchParams.get('q')?.trim();

    let query = admin
      .from('audit_ledger')
      .select('*', { count: 'exact' })
      .order('sequence_no', { ascending: false });

    if (agent) {
      const val = agent.toLowerCase();
      if (val === 'human' || val === 'system') {
        query = query.eq('actor_type', val);
      } else {
        query = query.eq('actor_id', val);
      }
    }

    if (result) {
      query = query.eq('result', result.toLowerCase());
    }

    if (action) {
      query = query.ilike('action_type', `%${action.toLowerCase()}%`);
    }

    if (q) {
      if (/^\d+$/.test(q)) {
        query = query.eq('sequence_no', parseInt(q, 10));
      } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)) {
        query = query.eq('correlation_id', q);
      } else {
        query = query.or(`target_ref.ilike.%${q}%,action_type.ilike.%${q}%,actor_id.ilike.%${q}%`);
      }
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalMatching = count ?? (data?.length || 0);
    const totalPages = Math.max(1, Math.ceil(totalMatching / limit));

    const entries = (data || []).map((e) => ({
      id: String(e.id),
      seq: e.sequence_no,
      type: e.action_type || 'system.audit',
      actor: e.actor_id || e.actor_type || 'system',
      actorType: e.actor_type,
      time: e.occurred_at
        ? new Date(e.occurred_at).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '11:42',
      corr: e.correlation_id ? `cr-${e.correlation_id.slice(0, 4)}` : 'cr-118',
      fullCorr: e.correlation_id || 'cr-118',
      target: e.target_ref || 'pg.prod · kyc_documents',
      entryHash: e.entry_hash
        ? `${e.entry_hash.slice(0, 4)}…${e.entry_hash.slice(-3)}`
        : 'a3f0…9c1',
      fullEntryHash: e.entry_hash || '',
      prevHash: e.prev_hash ? `${e.prev_hash.slice(0, 4)}…${e.prev_hash.slice(-3)}` : '0000…000',
      fullPrevHash: e.prev_hash || '',
      result: e.result || 'success',
      detail: e.detail,
      dot: e.result === 'success' ? '#0FB5A5' : e.result === 'failure' ? '#D9534F' : '#C9A227',
      actorStyle:
        e.actor_type === 'agent'
          ? 'bg-[#e6f7f5] text-[#0a8d80]'
          : e.actor_type === 'human'
            ? 'bg-[#f7f0d8] text-[#8a6d10]'
            : 'bg-slate-100 text-slate-600',
      chainHead: e.sequence_no === 1,
    }));

    return NextResponse.json({
      entries,
      totalCount: totalMatching,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
