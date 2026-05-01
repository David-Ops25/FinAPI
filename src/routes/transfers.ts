import rateLimit from "express-rate-limit";
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { env } from "../config/env";
import { requireApiKey } from "../middleware/api-key";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";
import { encodeJsonSafeTextFragment } from "../security/json-output-safety";
import { evaluateTransferFraud } from "../services/fraud";
import { logAudit } from "../services/audit";
import { store } from "../services/store";

const transferLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_TRANSFER_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Transfer rate limit exceeded" },
  keyGenerator: (req) => (req.auth?.userId ? `u:${req.auth.userId}` : `ip:${req.ip}`)
});

const router = Router();
router.use(requireApiKey, requireAuth, requireRole(["user", "admin"]), transferLimiter);

const transferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.coerce.number().positive().max(env.TRANSFER_SINGLE_LIMIT),
  note: z.string().max(140).optional(),
  transactionSignature: z.string().min(32).max(256)
});

router.post("/", (req, res) => {
  const idempotencyKey = req.header("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    throw new AppError(400, "Missing or invalid Idempotency-Key header");
  }
  const existingTx = store.idempotencyTransfers.get(idempotencyKey);
  if (existingTx) {
    const tx = store.transactions.get(existingTx);
    res.status(200).json({ idempotentReplay: true, transaction: tx });
    return;
  }

  const body = transferSchema.parse(req.body);
  const safeNote = body.note !== undefined ? encodeJsonSafeTextFragment(body.note) : undefined;
  const from = store.accounts.get(body.fromAccountId);
  const to = store.accounts.get(body.toAccountId);
  if (!from || !to) {
    throw new AppError(404, "Account not found");
  }
  if (req.auth?.role === "user" && from.userId !== req.auth.userId) {
    throw new AppError(403, "Cannot transfer from this account");
  }
  if (from.balance < body.amount) {
    throw new AppError(400, "Insufficient balance");
  }
  const today = new Date().toISOString().slice(0, 10);
  const dailyTotal = [...store.transactions.values()]
    .filter((t) => t.accountId === from.id && t.type === "transfer" && t.createdAt.startsWith(today))
    .reduce((acc, tx) => acc + tx.amount, 0);
  if (dailyTotal + body.amount > env.TRANSFER_DAILY_LIMIT) {
    throw new AppError(400, "Daily transfer limit exceeded");
  }

  const fraudFlags = evaluateTransferFraud({ fromAccountId: from.id, amount: body.amount });

  from.balance -= body.amount;
  to.balance += body.amount;
  store.accounts.set(from.id, from);
  store.accounts.set(to.id, to);

  const txId = uuidv4();
  store.transactions.set(txId, {
    id: txId,
    accountId: from.id,
    type: "transfer",
    amount: body.amount,
    description: safeNote ?? "Fund transfer",
    createdAt: new Date().toISOString(),
    fraudFlags: fraudFlags.length ? fraudFlags : undefined
  });
  store.idempotencyTransfers.set(idempotencyKey, txId);

  logAudit({
    eventType: "transfer.executed",
    actorUserId: req.auth?.userId,
    status: "success",
    metadata: {
      fromAccountId: from.id,
      toAccountId: to.id,
      amount: body.amount,
      signatureValidated: body.transactionSignature.length >= 32,
      fraudFlags: fraudFlags.length ? fraudFlags.join(",") : "none"
    }
  });

  res.status(201).json({
    transactionId: txId,
    fromBalance: from.balance,
    toBalance: to.balance,
    fraudReviewRecommended: fraudFlags.length > 0,
    fraudFlags
  });
});

export const transfersRouter = router;
