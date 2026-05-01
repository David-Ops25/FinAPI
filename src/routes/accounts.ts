import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";
import { store } from "../services/store";

const router = Router();
router.use(requireAuth);

const accountIdParam = z.object({ id: z.string().uuid() });

router.get("/", requireRole(["user", "admin"]), (req, res) => {
  const accounts =
    req.auth?.role === "user"
      ? [...store.accounts.values()].filter((a) => a.userId === req.auth?.userId)
      : [...store.accounts.values()];
  res.json(accounts);
});

router.get("/:id", requireRole(["user", "admin"]), (req, res) => {
  const { id } = accountIdParam.parse({ id: String(req.params.id) });
  const account = store.accounts.get(id);
  if (!account) {
    throw new AppError(404, "Account not found");
  }
  if (req.auth?.role === "user" && account.userId !== req.auth?.userId) {
    throw new AppError(403, "Not permitted for this account");
  }
  res.json(account);
});

export const accountsRouter = router;
