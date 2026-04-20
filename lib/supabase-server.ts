import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSupabasePublicConfig } from './supabase-public-env';

// Section 8 – App Router server client with cookie handling.
export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicConfig();
  type CookieWrite = { name: string; value: string; options: CookieOptions };

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieWrite[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server components may call this client in a read-only cookie context.
          }
        },
      },
    },
  );
};
