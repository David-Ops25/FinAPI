import pino from "pino";
import { env } from "./config/env";
import { PINO_REDACT_PATHS } from "./security/mask-sensitive-data-in-logs-and-errors";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [...PINO_REDACT_PATHS],
    remove: true
  }
});
