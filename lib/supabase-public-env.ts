const publicSupabaseEnvNames = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

export type PublicSupabaseEnvName = (typeof publicSupabaseEnvNames)[number];

export const getRequiredPublicEnv = (name: PublicSupabaseEnvName) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const getSupabasePublicConfig = () => ({
  url: getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey: getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
});
