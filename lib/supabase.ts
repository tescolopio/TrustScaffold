import { createBrowserClient } from '@supabase/ssr';

import { getSupabasePublicConfig } from './supabase-public-env';

// Section 8 – browser-safe client helper.
export const createSupabaseBrowserClient = () => {
  const { url, anonKey } = getSupabasePublicConfig();

  return createBrowserClient(url, anonKey);
};
