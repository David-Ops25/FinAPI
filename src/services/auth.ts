import argon2 from "argon2";
import jwt, { SignOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env";
import { Role, User } from "../types/domain";
import { store } from "./store";

interface JwtPayload {
  sub: string;
  role: Role;
  jti: string;
  typ: "access" | "refresh";
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

function signToken(payload: JwtPayload, secret: string, expiresIn: string): string {
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
}

export function generateTokenPair(user: User): { accessToken: string; refreshToken: string; refreshJti: string } {
  const accessJti = uuidv4();
  const refreshJti = uuidv4();
  const accessToken = signToken(
    { sub: user.id, role: user.role, jti: accessJti, typ: "access" },
    env.JWT_ACCESS_SECRET,
    env.ACCESS_TOKEN_TTL
  );
  const refreshToken = signToken(
    { sub: user.id, role: user.role, jti: refreshJti, typ: "refresh" },
    env.JWT_REFRESH_SECRET,
    env.REFRESH_TOKEN_TTL
  );

  store.refreshTokens.set(refreshJti, {
    jti: refreshJti,
    userId: user.id,
    revoked: false,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  });

  return { accessToken, refreshToken, refreshJti };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}

export function revokeRefreshToken(jti: string): void {
  const token = store.refreshTokens.get(jti);
  if (token) {
    token.revoked = true;
    store.refreshTokens.set(jti, token);
  }
}
