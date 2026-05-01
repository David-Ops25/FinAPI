import { Response } from "express";
import { env } from "../config/env";

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/auth",
    maxAge: env.REFRESH_TOKEN_TTL_MS
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.REFRESH_COOKIE_NAME, {
    path: "/auth",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax"
  });
}

export function readRefreshFromRequest(req: { cookies?: Record<string, string> }): string | undefined {
  const fromCookie = req.cookies?.[env.REFRESH_COOKIE_NAME];
  if (typeof fromCookie === "string" && fromCookie.length > 20) {
    return fromCookie;
  }
  return undefined;
}
