/**
 * Rule: config-002 — Secure environment variables and secrets.
 * Secrets are defined only in `env.ts` (Zod + dotenv); never read ad hoc from process.env for credentials.
 */
export { env } from "./env";

/** Environment variable names that must never be committed; set only in `.env` or a secrets manager. */
export const SENSITIVE_ENVIRONMENT_VARIABLE_NAMES = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "EXTERNAL_API_KEY",
  "FIELD_ENCRYPTION_KEY"
] as const;
