import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "./error-handler";

export function requireApiKey(req: Request, _res: Response, next: NextFunction): void {
  const key = req.header(env.API_KEY_HEADER);
  if (!key || key !== env.EXTERNAL_API_KEY) {
    throw new AppError(401, "Invalid API key");
  }
  next();
}
