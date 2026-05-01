/**
 * Declared cryptographic primitives for static analysis and security review (crypto-001 / static-cryp-002).
 * Runtime code must align with these choices.
 */
export const PASSWORD_HASH_ALGORITHM = "argon2id" as const;
export const JWT_SIGNING_ALGORITHM = "HS256" as const;
export const SYMMETRIC_AT_REST_ALGORITHM = "aes-256-gcm" as const;
export const TOTP_ALGORITHM = "SHA-1" as const;
