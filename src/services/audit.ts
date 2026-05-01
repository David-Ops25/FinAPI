import { v4 as uuidv4 } from "uuid";
import { forwardSecurityAuditToCloudSink } from "../infrastructure/enable-aws-cloudtrail-and-access-logging";
import { maskSensitiveDataInStructuredLogValue } from "../security/mask-sensitive-data-in-logs-and-errors";
import { enforceAuditLogRetention } from "../security/data-retention-policy";
import { AuditLogEvent } from "../types/domain";
import { logger } from "../logger";
import { store } from "./store";

function sanitizeMetadataForLogs(metadata: AuditLogEvent["metadata"]): AuditLogEvent["metadata"] {
  const out: AuditLogEvent["metadata"] = {};
  for (const key of Object.keys(metadata)) {
    const value = metadata[key as keyof typeof metadata];
    if (typeof value === "string" && value.includes("@")) {
      Object.assign(out, { [key]: maskSensitiveDataInStructuredLogValue(value) });
    } else {
      Object.assign(out, { [key]: value });
    }
  }
  return out;
}

export function logAudit(event: Omit<AuditLogEvent, "id" | "createdAt">): void {
  const payload: AuditLogEvent = {
    ...event,
    id: uuidv4(),
    createdAt: new Date().toISOString()
  };
  store.auditLogs.push(payload);
  enforceAuditLogRetention(store.auditLogs);
  const logMetadata = sanitizeMetadataForLogs(payload.metadata);
  logger.info(
    {
      audit: true,
      eventType: payload.eventType,
      auditId: payload.id,
      status: payload.status,
      actorUserId: payload.actorUserId,
      metadata: logMetadata
    },
    "audit_event"
  );
  forwardSecurityAuditToCloudSink({
    eventType: payload.eventType,
    auditId: payload.id,
    status: payload.status,
    actorUserId: payload.actorUserId ?? null
  });
}
