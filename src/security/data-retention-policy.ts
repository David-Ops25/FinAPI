/**
 * static-data-005: bounded retention for in-memory audit trail (replace with DB TTL / legal holds in production).
 */
import type { AuditLogEvent } from "../types/domain";

export const AUDIT_LOG_MAX_ENTRIES = 5000;

export function enforceAuditLogRetention(logs: AuditLogEvent[]): void {
  const overflow = logs.length - AUDIT_LOG_MAX_ENTRIES;
  if (overflow > 0) {
    logs.splice(0, overflow);
  }
}
