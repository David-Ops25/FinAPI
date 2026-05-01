import { Router } from "express";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../middleware/error-handler";
import { requireAuth } from "../middleware/auth";
import { encryptAtRest, decryptAtRest } from "../security/field-encryption-at-rest";
import {
  generateTokenPair,
  hashPassword,
  revokeRefreshToken,
  signMfaPreAuthToken,
  verifyMfaPreAuthToken,
  verifyPassword,
  verifyRefreshToken
} from "../services/auth";
import { buildTotpKeyUri, generateTotpSecret, verifyTotpCode } from "../services/mfa-totp";
import { logAudit } from "../services/audit";
import { store } from "../services/store";
import { clearRefreshCookie, readRefreshFromRequest, setRefreshCookie } from "../utils/cookies";
import { maskAccountNumber, validatePasswordStrength } from "../utils/security";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later" },
  keyGenerator: (req) => {
    const email = typeof (req.body as { email?: string })?.email === "string" ? (req.body as { email: string }).email : "unknown";
    return `${req.ip}:${email.toLowerCase()}`;
  }
});

const registerLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_REGISTER_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts, please try again later" },
  keyGenerator: (req) => req.ip ?? "unknown"
});

const mfaVerifyLoginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many MFA attempts, please try again later" },
  keyGenerator: (req) => req.ip ?? "unknown"
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12)
});

router.post("/register", registerLimiter, async (req, res) => {
  const body = registerSchema.parse(req.body);
  if (!validatePasswordStrength(body.password)) {
    throw new AppError(400, "Password does not meet complexity policy");
  }
  if (store.usersByEmail.has(body.email)) {
    throw new AppError(409, "User already exists");
  }
  const user = store.createUser({
    email: body.email,
    passwordHash: await hashPassword(body.password),
    role: "user"
  });
  const accountId = uuidv4();
  const suffix = user.id.replace(/-/g, "").slice(0, 4).toUpperCase();
  store.accounts.set(accountId, {
    id: accountId,
    userId: user.id,
    accountNumberMasked: maskAccountNumber(`00000000${suffix}`),
    balance: 2000,
    currency: "USD"
  });
  logAudit({ eventType: "auth.register", actorUserId: user.id, status: "success", metadata: { role: "user" } });
  res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
router.post("/login", loginLimiter, async (req, res) => {
  const body = loginSchema.parse(req.body);
  const userId = store.usersByEmail.get(body.email);
  if (!userId) {
    logAudit({
      eventType: "auth.login",
      status: "failure",
      metadata: { reason: "invalid_credentials", emailDomain: body.email.split("@")[1] ?? "unknown" }
    });
    throw new AppError(401, "Invalid credentials");
  }
  const user = store.users.get(userId)!;
  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    logAudit({ eventType: "auth.login", actorUserId: user.id, status: "failure", metadata: { reason: "account_locked" } });
    throw new AppError(423, "Account temporarily locked");
  }
  const valid = await verifyPassword(user.passwordHash, body.password);
  if (!valid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= env.MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = Date.now() + env.LOCKOUT_MINUTES * 60 * 1000;
      user.failedLoginAttempts = 0;
    }
    store.users.set(user.id, user);
    logAudit({ eventType: "auth.login", actorUserId: user.id, status: "failure", metadata: { reason: "invalid_credentials" } });
    throw new AppError(401, "Invalid credentials");
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  store.users.set(user.id, user);

  if (user.mfaEnabled) {
    const mfaToken = signMfaPreAuthToken(user.id);
    logAudit({
      eventType: "auth.login",
      actorUserId: user.id,
      status: "success",
      metadata: { role: user.role, mfaChallenge: "issued" }
    });
    res.json({ mfaRequired: true, mfaToken });
    return;
  }

  const tokens = generateTokenPair(user);
  setRefreshCookie(res, tokens.refreshToken);
  logAudit({ eventType: "auth.login", actorUserId: user.id, status: "success", metadata: { role: user.role } });
  res.json({
    accessToken: tokens.accessToken,
    refreshJti: tokens.refreshJti,
    tokenBinding: "refresh_token issued as HttpOnly cookie (Path=/auth); not echoed in JSON"
  });
});

router.post("/mfa/setup", requireAuth, (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }
  const user = store.users.get(userId);
  if (!user) {
    throw new AppError(401, "User not found");
  }
  if (user.mfaEnabled) {
    throw new AppError(400, "MFA already enabled; disable before re-provisioning");
  }
  const secret = generateTotpSecret();
  user.mfaTotpSecretEnc = encryptAtRest(secret);
  store.users.set(user.id, user);
  logAudit({ eventType: "auth.mfa.setup", actorUserId: user.id, status: "success", metadata: { step: "provisioned" } });
  res.status(201).json({
    secret,
    otpauthUrl: buildTotpKeyUri(user.email, secret),
    nextStep: "POST /auth/mfa/enable with { code } from your authenticator app"
  });
});

router.post("/mfa/enable", requireAuth, (req, res) => {
  const body = z.object({ code: z.string().min(6).max(12) }).parse(req.body);
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }
  const user = store.users.get(userId);
  if (!user) {
    throw new AppError(401, "User not found");
  }
  if (!user.mfaTotpSecretEnc) {
    throw new AppError(400, "MFA setup not started");
  }
  if (user.mfaEnabled) {
    throw new AppError(400, "MFA already enabled");
  }
  const plain = decryptAtRest(user.mfaTotpSecretEnc);
  if (!verifyTotpCode(plain, body.code)) {
    logAudit({ eventType: "auth.mfa.enable", actorUserId: user.id, status: "failure", metadata: { reason: "invalid_totp" } });
    throw new AppError(401, "Invalid TOTP code");
  }
  user.mfaEnabled = true;
  store.users.set(user.id, user);
  logAudit({ eventType: "auth.mfa.enable", actorUserId: user.id, status: "success", metadata: {} });
  res.status(204).send();
});

router.post("/mfa/disable", requireAuth, async (req, res) => {
  const body = z.object({ password: z.string().min(1) }).parse(req.body);
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError(401, "Unauthorized");
  }
  const user = store.users.get(userId);
  if (!user) {
    throw new AppError(401, "User not found");
  }
  const valid = await verifyPassword(user.passwordHash, body.password);
  if (!valid) {
    logAudit({ eventType: "auth.mfa.disable", actorUserId: user.id, status: "failure", metadata: { reason: "bad_password" } });
    throw new AppError(401, "Invalid password");
  }
  user.mfaEnabled = false;
  user.mfaTotpSecretEnc = null;
  store.users.set(user.id, user);
  logAudit({ eventType: "auth.mfa.disable", actorUserId: user.id, status: "success", metadata: {} });
  res.status(204).send();
});

router.post("/mfa/verify-login", mfaVerifyLoginLimiter, (req, res) => {
  const body = z.object({ mfaToken: z.string().min(20), code: z.string().min(6).max(12) }).parse(req.body);
  let claims;
  try {
    claims = verifyMfaPreAuthToken(body.mfaToken);
  } catch {
    throw new AppError(401, "Invalid or expired MFA token");
  }
  const user = store.users.get(claims.sub);
  if (!user || !user.mfaEnabled || !user.mfaTotpSecretEnc) {
    throw new AppError(401, "Invalid MFA session");
  }
  const plain = decryptAtRest(user.mfaTotpSecretEnc);
  if (!verifyTotpCode(plain, body.code)) {
    logAudit({ eventType: "auth.mfa.verify_login", actorUserId: user.id, status: "failure", metadata: { reason: "invalid_totp" } });
    throw new AppError(401, "Invalid TOTP code");
  }
  const tokens = generateTokenPair(user);
  setRefreshCookie(res, tokens.refreshToken);
  logAudit({ eventType: "auth.mfa.verify_login", actorUserId: user.id, status: "success", metadata: {} });
  res.json({
    accessToken: tokens.accessToken,
    refreshJti: tokens.refreshJti,
    tokenBinding: "refresh_token issued as HttpOnly cookie (Path=/auth); not echoed in JSON"
  });
});

router.post("/refresh", (req, res) => {
  const refreshToken = readRefreshFromRequest(req);
  if (!refreshToken) {
    throw new AppError(401, "Missing refresh token");
  }
  const decoded = verifyRefreshToken(refreshToken);
  if (decoded.typ !== "refresh") {
    throw new AppError(401, "Invalid token");
  }
  const tokenRecord = store.refreshTokens.get(decoded.jti);
  if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < Date.now()) {
    throw new AppError(401, "Refresh token is no longer valid");
  }
  revokeRefreshToken(decoded.jti);
  const user = store.users.get(decoded.sub);
  if (!user) {
    throw new AppError(401, "User not found");
  }
  const tokens = generateTokenPair(user);
  setRefreshCookie(res, tokens.refreshToken);
  logAudit({ eventType: "auth.refresh", actorUserId: user.id, status: "success", metadata: { rotated: true } });
  res.json({
    accessToken: tokens.accessToken,
    refreshJti: tokens.refreshJti,
    tokenBinding: "refresh_token rotated via HttpOnly cookie"
  });
});

const logoutSchema = z.object({ refreshJti: z.string().uuid().optional() });
router.post("/logout", (req, res) => {
  const body = logoutSchema.parse(req.body);
  if (body.refreshJti) {
    revokeRefreshToken(body.refreshJti);
  }
  const refreshToken = readRefreshFromRequest(req);
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      if (decoded.typ === "refresh") {
        revokeRefreshToken(decoded.jti);
      }
    } catch {
      /* best-effort revoke */
    }
  }
  clearRefreshCookie(res);
  logAudit({ eventType: "auth.logout", status: "success", metadata: { revoked: true } });
  res.status(204).send();
});

export const authRouter = router;
