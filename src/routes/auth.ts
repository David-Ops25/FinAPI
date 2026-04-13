import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../middleware/error-handler";
import { generateTokenPair, hashPassword, revokeRefreshToken, verifyPassword, verifyRefreshToken } from "../services/auth";
import { logAudit } from "../services/audit";
import { store } from "../services/store";
import { maskAccountNumber, validatePasswordStrength } from "../utils/security";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  role: z.enum(["customer", "analyst", "admin"]).default("customer")
});

router.post("/register", async (req, res) => {
  const body = registerSchema.parse(req.body);
  if (!validatePasswordStrength(body.password)) {
    throw new AppError(400, "Password does not meet complexity policy");
  }
  if (store.usersByEmail.has(body.email)) {
    throw new AppError(409, "User already exists");
  }
  const user = store.createUser({ email: body.email, passwordHash: await hashPassword(body.password), role: body.role });
  const accountId = uuidv4();
  const suffix = user.id.replace(/-/g, "").slice(0, 4).toUpperCase();
  store.accounts.set(accountId, {
    id: accountId,
    userId: user.id,
    accountNumberMasked: maskAccountNumber(`00000000${suffix}`),
    balance: 2000,
    currency: "USD"
  });
  logAudit({ eventType: "auth.register", actorUserId: user.id, status: "success", metadata: { role: body.role } });
  res.status(201).json({ id: user.id, email: user.email, role: user.role });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
router.post("/login", async (req, res) => {
  const body = loginSchema.parse(req.body);
  const userId = store.usersByEmail.get(body.email);
  if (!userId) {
    logAudit({ eventType: "auth.login", status: "failure", metadata: { reason: "invalid_credentials", email: body.email } });
    throw new AppError(401, "Invalid credentials");
  }
  const user = store.users.get(userId)!;
  if (user.lockedUntil && user.lockedUntil > Date.now()) {
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
  const tokens = generateTokenPair(user);
  logAudit({ eventType: "auth.login", actorUserId: user.id, status: "success", metadata: { role: user.role } });
  res.json(tokens);
});

const refreshSchema = z.object({ refreshToken: z.string().min(20) });
router.post("/refresh", (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
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
  logAudit({ eventType: "auth.refresh", actorUserId: user.id, status: "success", metadata: { rotated: true } });
  res.json(tokens);
});

const logoutSchema = z.object({ refreshJti: z.string().uuid() });
router.post("/logout", (req, res) => {
  const body = logoutSchema.parse(req.body);
  revokeRefreshToken(body.refreshJti);
  logAudit({ eventType: "auth.logout", status: "success", metadata: { revoked: true } });
  res.status(204).send();
});

export const authRouter = router;
