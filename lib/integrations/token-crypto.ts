import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { getRequiredServerEnv } from '@/lib/supabase-server-env';

function getEncryptionKey() {
  return createHash('sha256').update(getRequiredServerEnv('SUPABASE_SERVICE_ROLE_KEY')).digest();
}

export function encryptIntegrationToken(token: string) {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(trimmedToken, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

export function decryptIntegrationToken(encryptedToken: string | null) {
  if (!encryptedToken) {
    return null;
  }

  const [version, iv, authTag, ciphertext] = encryptedToken.split(':');

  if (version !== 'v1' || !iv || !authTag || !ciphertext) {
    throw new Error('Unsupported integration token format');
  }

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}