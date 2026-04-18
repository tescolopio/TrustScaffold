import { createBrowserClient } from '@supabase/ssr';

import { getRequiredPublicEnv } from './supabase-public-env';

// Section 8 – browser-safe client helper.
export const createSupabaseBrowserClient = () =>
  createBrowserClient(
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  );
