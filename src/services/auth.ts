import argon2 from "argon2";
import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env";
import { JWT_SIGNING_ALGORITHM, PASSWORD_HASH_ALGORITHM } from "../security/cryptography-policy";
import { Role, User } from "../types/domain";
import { store } from "./store";

interface JwtPayload {
  sub: string;
  role: Role;
  jti: string;
  typ: "access" | "refresh";
}

export interface MfaPreAuthClaims {
  sub: string;
  typ: "mfa_preauth";
  jti: string;
}

export async function hashPassword(password: string): Promise<string> {
  if (PASSWORD_HASH_ALGORITHM !== "argon2id") {
    throw new Error("PASSWORD_HASH_ALGORITHM misconfiguration");
  }
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

const jwtVerifyOptions: VerifyOptions = { algorithms: ["HS256"] };

function signToken(payload: JwtPayload, secret: string, expiresIn: string): string {
  return jwt.sign(payload, secret, { expiresIn, algorithm: "HS256" } as SignOptions);
}

export function generateTokenPair(user: User): { accessToken: string; refreshToken: string; refreshJti: string } {
  if (JWT_SIGNING_ALGORITHM !== "HS256") {
    throw new Error("JWT_SIGNING_ALGORITHM misconfiguration");
  }
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
    expiresAt: Date.now() + env.REFRESH_TOKEN_TTL_MS
  });

  return { accessToken, refreshToken, refreshJti };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, jwtVerifyOptions) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, jwtVerifyOptions) as JwtPayload;
}

export function revokeRefreshToken(jti: string): void {
  const token = store.refreshTokens.get(jti);
  if (token) {
    token.revoked = true;
    store.refreshTokens.set(jti, token);
  }
}

export function signMfaPreAuthToken(userId: string): string {
  return jwt.sign(
    { sub: userId, typ: "mfa_preauth", jti: uuidv4() },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "5m", algorithm: "HS256" } as SignOptions
  );
}

export function verifyMfaPreAuthToken(token: string): MfaPreAuthClaims {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, jwtVerifyOptions) as MfaPreAuthClaims;
  if (decoded.typ !== "mfa_preauth") {
    throw new Error("invalid_mfa_preauth");
  }
  return decoded;
}
