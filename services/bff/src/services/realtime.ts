import { EventEmitter } from 'node:events';
import type { RealtimeEvent } from '@axiom/types';
import { logger } from '../lib/logger.js';

export interface RealtimeService {
  broadcast(event: RealtimeEvent): void;
  subscribe(handler: (event: RealtimeEvent) => void): () => void;
}

/**
 * In-process realtime event bus. In production, this would be backed
 * by Supabase Realtime channels (Postgres CDC) for cross-instance
 * delivery. For Phase 0/1, in-process is sufficient.
 */
export function startRealtimeChannel(_deps: {
  ledger: unknown;
  killSwitch: unknown;
}): RealtimeService {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(1000);

  return {
    broadcast(event) {
      emitter.emit('event', event);
    },
    subscribe(handler) {
      emitter.on('event', handler);
      return () => emitter.off('event', handler);
    },
  };
}
