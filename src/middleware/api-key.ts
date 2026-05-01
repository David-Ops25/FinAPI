import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { NextFunction, Request, Response } from "express";
import { env } from "../config/secure-environment-variables-and-secrets";
import { AppError } from "./error-handler";

export function requireApiKey(req: Request, _res: Response, next: NextFunction): void {
  const key = req.header(env.API_KEY_HEADER);
  if (!key) {
    throw new AppError(401, "Invalid API key");
  }
  const expected = env.EXTERNAL_API_KEY;
  const a = Buffer.from(key, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError(401, "Invalid API key");
  }
  next();
}
