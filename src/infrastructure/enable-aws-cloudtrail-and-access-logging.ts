/**
 * Rule: static-infr-001 — Enable CloudTrail and access logging.
 *
 * AWS account / organization: enable a multi-Region CloudTrail trail, management events,
 * S3 + CloudWatch Logs delivery, and optional data events for sensitive APIs.
 *
 * This Node service complements that by emitting structured audit events; forward them
 * (e.g. CloudWatch Logs → CloudTrail Lake) via `forwardSecurityAuditToCloudSink` when
 * `CLOUD_AUDIT_SINK_ENABLED=true`.
 *
 * @see https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html
 */
export { forwardSecurityAuditToCloudSink } from "./cloud-access-logging";

export const AWS_CLOUDTRAIL_AND_ACCESS_LOGGING_CONTROL_ID = "static-infr-001";
