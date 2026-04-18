import 'server-only';

export const getRequiredServerEnv = (name: 'SUPABASE_SERVICE_ROLE_KEY') => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};
