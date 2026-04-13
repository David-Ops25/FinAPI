import { v4 as uuidv4 } from "uuid";
import { AuditLogEvent } from "../types/domain";
import { store } from "./store";

export function logAudit(event: Omit<AuditLogEvent, "id" | "createdAt">): void {
  const payload: AuditLogEvent = {
    ...event,
    id: uuidv4(),
    createdAt: new Date().toISOString()
  };
  store.auditLogs.push(payload);
  console.log(JSON.stringify({ type: "audit", ...payload }));
}
