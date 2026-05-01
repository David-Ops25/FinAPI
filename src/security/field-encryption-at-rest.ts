/**
 * static-data-001: sensitive fields (e.g. MFA seeds) encrypted at rest in the application store.
 * Algorithm label: `cryptography-policy.SYMMETRIC_AT_REST_ALGORITHM` (AES-256-GCM).
 * Key from FIELD_ENCRYPTION_KEY (hex 64) or SHA-256 of JWT_REFRESH_SECRET as demo fallback.
 */
import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env";

function getKey32(): Buffer {
  if (env.FIELD_ENCRYPTION_KEY) {
    return Buffer.from(env.FIELD_ENCRYPTION_KEY, "hex");
  }
  return createHash("sha256").update(env.JWT_REFRESH_SECRET).digest();
}

export function encryptAtRest(plaintext: string): string {
  const key = getKey32();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptAtRest(blob: string): string {
  const key = getKey32();
  const buf = Buffer.from(blob, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
