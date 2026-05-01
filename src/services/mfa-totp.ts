import { generateSecret, generateURI, verifySync } from "otplib";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildTotpKeyUri(accountLabel: string, secret: string): string {
  return generateURI({
    issuer: "FinTrust",
    label: accountLabel,
    secret
  });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, "");
  const result = verifySync({
    secret,
    token: normalized,
    epochTolerance: 1
  });
  return result.valid === true;
}
