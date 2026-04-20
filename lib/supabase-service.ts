import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { getSupabaseServiceRoleConfig } from './supabase-server-env';

// Section 7 + Section 8 – server-only service role client for secure operations.
export const createSupabaseServiceRoleClient = () => {
  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
