import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/auth";
import { Role } from "../types/domain";
import { AppError } from "./error-handler";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  if (!token) {
    throw new AppError(401, "Missing access token");
  }

  const decoded = verifyAccessToken(token);
  if (decoded.typ !== "access") {
    throw new AppError(401, "Invalid token type");
  }
  req.auth = { userId: decoded.sub, role: decoded.role };
  next();
}

export function requireRole(roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const role = req.auth?.role;
    if (!role || !roles.includes(role)) {
      throw new AppError(403, "Insufficient privileges");
    }
    next();
  };
}
