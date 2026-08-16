import { LedgerClient } from '@axiom/ledger';
import { loadEnv } from '@axiom/config';
import type { AppendLedgerInput, AppendLedgerResult } from '@axiom/ledger';

export interface LedgerService {
  append(input: AppendLedgerInput): Promise<AppendLedgerResult>;
  appendAndForget(input: AppendLedgerInput): void;
  verify(
    tenantId: string,
    fromSequence?: number,
  ): Promise<
    { intact: true } | { intact: false; firstBreak: { sequenceNo: number; reason: string } }
  >;
  query(opts: Parameters<LedgerClient['query']>[0]): ReturnType<LedgerClient['query']>;
}

export function createLedgerService(): LedgerService {
  const env = loadEnv();
  const client = new LedgerClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

  return {
    append: (input) => client.append(input),
    verify: (tenantId, fromSequence) => client.verify(tenantId, fromSequence),
    query: (opts) => client.query(opts),
    appendAndForget(input) {
      client.append(input).catch((err: Error) => {
        // eslint-disable-next-line no-console
        console.error('ledger appendAndForget failed', err.message);
      });
    },
  };
}
