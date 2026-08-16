import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AgentContractSchema, AGENT_CONTRACTS } from './agents';

const baseContract = {
  name: 'drishti' as const,
  displayName: 'Drishti',
  oneLiner: 'Discovery',
  autonomyLevel: 'L1' as const,
  canMutate: false,
  inputSchema: z.object({ tenantId: z.string().uuid() }),
  outputSchema: z.object({ findings: z.array(z.string()) }),
  toolScopes: [],
  escalationConditions: [],
  phase: 1,
};

describe('agent contracts', () => {
  it('requires actual Zod schemas at the contract boundary', () => {
    expect(AgentContractSchema.parse(baseContract).inputSchema).toBeInstanceOf(z.ZodType);
    expect(() => AgentContractSchema.parse({ ...baseContract, inputSchema: {} })).toThrow(
      'inputSchema must be a Zod schema',
    );
  });

  it('keeps the static roster aligned with runtime permissions', () => {
    expect(AGENT_CONTRACTS.sudhaar.toolScopes).toContain('plan.propose');
    expect(AGENT_CONTRACTS.sudhaar.toolScopes).not.toContain('plan.write');
    expect(AGENT_CONTRACTS.karya.canMutate).toBe(true);
    expect(AGENT_CONTRACTS.sudhaar.canMutate).toBe(false);
  });
});
