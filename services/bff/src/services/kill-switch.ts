import { logger } from '../lib/logger.js';

interface KillSwitchState {
  engaged: boolean;
  reason: string;
  engagedBy: string;
  engagedAt: string;
  scope: 'global' | 'tenant';
  tenantId?: string;
}

/**
 * Kill switch — per Doc 04 §5.4, halts all in-flight execution
 * immediately, globally (or scoped to a tenant).
 *
 * This is a process-local flag. In a multi-replica deployment, all
 * BFF instances must share the same flag (e.g. via Redis or
 * a periodic sync from a leader). For Phase 0/1 single-replica
 * deployments, the in-process flag is sufficient.
 */
export interface KillSwitchService {
  isActive(tenantId?: string): boolean;
  engage(opts: {
    tenantId?: string;
    userId: string;
    reason: string;
    scope: 'global' | 'tenant';
  }): void;
  release(): void;
  state(): KillSwitchState;
}

export function createKillSwitchService(): KillSwitchService {
  const state: KillSwitchState = {
    engaged: false,
    reason: '',
    engagedBy: '',
    engagedAt: '',
    scope: 'global',
  };

  return {
    isActive(tenantId?: string) {
      if (!state.engaged) return false;
      if (state.scope === 'global') return true;
      return Boolean(tenantId && state.tenantId === tenantId);
    },
    engage({ tenantId, userId, reason, scope }) {
      state.engaged = true;
      state.engagedBy = userId;
      state.reason = reason;
      state.engagedAt = new Date().toISOString();
      state.scope = scope;
      state.tenantId = tenantId;
      logger.warn({ userId, reason, scope, tenantId }, 'KILL SWITCH ENGAGED');
    },
    release() {
      state.engaged = false;
      state.engagedBy = '';
      state.reason = '';
      state.engagedAt = '';
      state.tenantId = undefined;
      logger.warn('kill switch released');
    },
    state() {
      return { ...state };
    },
  };
}
