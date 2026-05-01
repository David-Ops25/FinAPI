/**
 * data-004: avoid logging raw PII / credentials. Paths align with Pino + pino-http redaction.
 */
import { env } from "../config/env";

function headerRedactPath(headerName: string): string {
  return `req.headers[${JSON.stringify(headerName.toLowerCase())}]`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || local === undefined) {
    return "[redacted]";
  }
  const keep = local.slice(0, 1);
  return `${keep}***@${domain}`;
}

export const PINO_REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  headerRedactPath(env.API_KEY_HEADER),
  "req.body.password",
  "req.body.refreshToken",
  "req.body.email",
  "req.body.code",
  "req.body.preAuthToken",
  "req.body.mfaToken",
  "*.password",
  "*.refreshToken",
  "*.accessToken",
  "*.mfaToken",
  "*.preAuthToken"
] as const;
