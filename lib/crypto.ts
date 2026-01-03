import crypto from "crypto";

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  }

  const decoded =
    key.length >= 43 && key.match(/^[A-Za-z0-9+/=]+$/) // likely base64
      ? Buffer.from(key, "base64")
      : Buffer.from(key, "utf8");

  if (decoded.length < 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be at least 32 bytes");
  }

  return decoded.subarray(0, 32);
}

const ENCRYPTION_KEY = getEncryptionKey();

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${encrypted.toString("base64")}.${authTag.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, encryptedB64, authTagB64] = payload.split(".");
  if (!ivB64 || !encryptedB64 || !authTagB64) {
    throw new Error("Invalid encrypted payload format");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    ENCRYPTION_KEY,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function hashToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateShareToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

type StateCookiePayload = {
  state: string;
  userId?: string;
  createdAt: number;
};

export function createStateCookieValue(userId?: string) {
  const state = crypto.randomBytes(24).toString("base64url");
  const payload: StateCookiePayload = {
    state,
    userId,
    createdAt: Date.now(),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return { state, encoded };
}

export function parseStateCookieValue(value?: string | null): StateCookiePayload | null {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as StateCookiePayload;
    if (typeof parsed.state !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
