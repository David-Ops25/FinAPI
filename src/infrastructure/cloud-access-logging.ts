/**
 * static-infr-006: production deployments should forward security-relevant events to managed audit services
 * (e.g. AWS CloudTrail for control-plane API calls, CloudWatch / Azure Monitor / GCP Cloud Audit Logs for data-plane).
 * This module is the application-side hook point; wire your SIEM exporter here.
 */
import { logger } from "../logger";

export function forwardSecurityAuditToCloudSink(eventSummary: Record<string, unknown>): void {
  if (process.env.CLOUD_AUDIT_SINK_ENABLED === "true") {
    logger.info({ cloudAuditForward: true, ...eventSummary }, "security_audit_export");
    return;
  }
  void eventSummary;
}
