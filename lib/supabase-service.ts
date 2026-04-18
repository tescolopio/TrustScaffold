import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { getRequiredEnv } from './supabase-env';

// Section 7 + Section 8 – server-only service role client for secure operations.
export const createSupabaseServiceRoleClient = () =>
  createSupabaseClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
