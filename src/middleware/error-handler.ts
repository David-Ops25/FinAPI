import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { logger } from "../logger";
import { CLIENT_INTERNAL_ERROR_MESSAGE, serializeErrorForServerLog } from "../security/mask-sensitive-data-in-logs-and-errors";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    if (env.NODE_ENV === "production") {
      res.status(400).json({ error: "Invalid request payload" });
    } else {
      res.status(400).json({ error: "Invalid request payload", details: err.flatten() });
    }
    return;
  }

  logger.error({ err: serializeErrorForServerLog(err), path: req.path, method: req.method }, "unhandled_error");
  res.status(500).json({ error: CLIENT_INTERNAL_ERROR_MESSAGE });
}
