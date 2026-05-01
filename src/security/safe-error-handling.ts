/**
 * error-001: stable client messages; server logs carry bounded diagnostic material only.
 */
import { env } from "../config/env";

export const CLIENT_INTERNAL_ERROR_MESSAGE = "Internal server error";

export function serializeErrorForServerLog(err: Error): Record<string, string | undefined> {
  if (env.NODE_ENV === "production") {
    return { name: err.name, message: err.message };
  }
  return { name: err.name, message: err.message, stack: err.stack };
}
