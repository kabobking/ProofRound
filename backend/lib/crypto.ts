import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey() {
  const keyBase64 = process.env.STRIPE_TOKEN_ENCRYPTION_KEY;
  if (!keyBase64) throw new Error('STRIPE_TOKEN_ENCRYPTION_KEY is required');
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) throw new Error('STRIPE_TOKEN_ENCRYPTION_KEY must be 32 bytes (base64)');
  return key;
}

export function encryptString(plain: string) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptString(payload: string) {
  const key = getKey();
  const data = Buffer.from(payload, 'base64');
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return out.toString('utf8');
}

export function generateDownloadToken() {
  return crypto.randomUUID();
}
