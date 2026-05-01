/**
 * Rule: data-004 — Mask sensitive data in logs and error messages.
 * OWASP: limit information exposure via logs and generic client errors.
 */
import { maskEmail as maskEmailImpl } from "./data-masking";

export { PINO_REDACT_PATHS } from "./data-masking";
export { CLIENT_INTERNAL_ERROR_MESSAGE, serializeErrorForServerLog } from "./safe-error-handling";

export const maskEmail = maskEmailImpl;

export function maskSensitiveDataInStructuredLogValue(value: unknown): unknown {
  if (typeof value === "string" && value.includes("@")) {
    return maskEmailImpl(value);
  }
  return value;
}
