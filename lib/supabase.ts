import { createBrowserClient } from '@supabase/ssr';

import { getRequiredEnv } from './supabase-env';

// Section 8 – browser-safe client helper.
export const createSupabaseBrowserClient = () =>
  createBrowserClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  );
