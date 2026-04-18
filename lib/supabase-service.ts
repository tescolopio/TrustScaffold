import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { getRequiredPublicEnv } from './supabase-public-env';
import { getRequiredServerEnv } from './supabase-server-env';

// Section 7 + Section 8 – server-only service role client for secure operations.
export const createSupabaseServiceRoleClient = () =>
  createSupabaseClient(
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
