import type { User } from '@supabase/supabase-js';
import type { UserRole } from '@axiom/types';

export type Variables = {
  user: User;
  token: string;
  tenantId: string;
  role: UserRole;
  idempotencyKey: string;
};
