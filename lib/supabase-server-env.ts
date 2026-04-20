import 'server-only';

import { getSupabasePublicConfig } from './supabase-public-env';

export type ServerSupabaseEnvName = 'SUPABASE_SERVICE_ROLE_KEY';

export const getRequiredServerEnv = (name: ServerSupabaseEnvName) => {
  if (typeof window !== 'undefined') {
    throw new Error(`${name} is server-only and must never be imported into the browser bundle`);
  }

  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const getSupabaseServiceRoleConfig = () => {
  const { url } = getSupabasePublicConfig();

  return {
    url,
    serviceRoleKey: getRequiredServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
};
