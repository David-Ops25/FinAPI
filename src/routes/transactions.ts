import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";
import { store } from "../services/store";

const router = Router();
router.use(requireAuth, requireRole(["user", "admin"]));

const querySchema = z.object({
  type: z.enum(["credit", "debit", "transfer"]).optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const txIdParam = z.object({ id: z.string().uuid() });

router.get("/", (req, res) => {
  const query = querySchema.parse(req.query);
  const ownAccountIds = new Set(
    [...store.accounts.values()].filter((a) => a.userId === req.auth?.userId).map((a) => a.id)
  );
  let tx = [...store.transactions.values()].filter((t) =>
    req.auth?.role === "user" ? ownAccountIds.has(t.accountId) : true
  );
  tx = tx.filter((t) => (query.type ? t.type === query.type : true));
  tx = tx.filter((t) => (query.minAmount ? t.amount >= query.minAmount : true));
  tx = tx.filter((t) => (query.maxAmount ? t.amount <= query.maxAmount : true));
  tx = tx.filter((t) => (query.startDate ? t.createdAt >= query.startDate : true));
  tx = tx.filter((t) => (query.endDate ? t.createdAt <= query.endDate : true));
  res.json(tx);
});

router.get("/:id", (req, res) => {
  const { id } = txIdParam.parse({ id: String(req.params.id) });
  const tx = store.transactions.get(id);
  if (!tx) {
    throw new AppError(404, "Transaction not found");
  }
  if (req.auth?.role === "user") {
    const account = store.accounts.get(tx.accountId);
    if (!account || account.userId !== req.auth?.userId) {
      throw new AppError(403, "Not permitted");
    }
  }
  res.json(tx);
});

export const transactionsRouter = router;
