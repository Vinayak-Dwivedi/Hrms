import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
} from "node:crypto";

export const ENC_PREFIX = "enc:v1:";
const IV_LEN = 12;
const KEY_LEN = 32;
const ALGO = "aes-256-gcm";

let encryptionKey: Buffer | null = null;
let indexKey: Buffer | null = null;

function decodeKeyMaterial(raw: string, label: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`${label} is empty.`);
  }

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  try {
    const fromB64 = Buffer.from(trimmed, "base64");
    if (fromB64.length === KEY_LEN) {
      return fromB64;
    }
  } catch {
    // fall through
  }

  if (trimmed.length >= KEY_LEN) {
    return createHash("sha256").update(trimmed, "utf8").digest();
  }

  throw new Error(
    `${label} must be a 32-byte secret (base64), 64-char hex, or a passphrase of at least 32 characters.`,
  );
}

export function initSensitiveFieldCrypto(keys: {
  encryptionKey: string;
  indexKey: string;
}) {
  encryptionKey = decodeKeyMaterial(keys.encryptionKey, "ENCRYPTION_KEY");
  indexKey = decodeKeyMaterial(keys.indexKey, "ENCRYPTION_INDEX_KEY");
}

function getEncryptionKey(): Buffer {
  if (!encryptionKey) {
    throw new Error("Sensitive field crypto is not initialized.");
  }
  return encryptionKey;
}

function getIndexKey(): Buffer {
  if (!indexKey) {
    throw new Error("Sensitive field index crypto is not initialized.");
  }
  return indexKey;
}

export function isEncryptedValue(stored: string): boolean {
  return stored.startsWith(ENC_PREFIX);
}

export function computeSensitiveFieldHash(normalized: string): string {
  return createHmac("sha256", getIndexKey())
    .update(normalized, "utf8")
    .digest("hex");
}

export function encryptSensitiveField(
  plain: string | null | undefined,
): { ciphertext: string; hash: string } | null {
  if (plain == null || plain === "") {
    return null;
  }

  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const ciphertext = `${ENC_PREFIX}${iv.toString("base64url")}:${encrypted.toString("base64url")}:${tag.toString("base64url")}`;
  const hash = computeSensitiveFieldHash(plain);
  return { ciphertext, hash };
}

export function decryptSensitiveField(
  stored: string | null | undefined,
): string | null {
  if (stored == null || stored === "") {
    return null;
  }
  if (!isEncryptedValue(stored)) {
    return stored;
  }

  const payload = stored.slice(ENC_PREFIX.length);
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted sensitive field format.");
  }

  const [ivB64, dataB64, tagB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");

  const decipher = createDecipheriv(ALGO, getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
