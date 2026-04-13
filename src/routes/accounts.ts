import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error-handler";
import { store } from "../services/store";

const router = Router();
router.use(requireAuth);

router.get("/", requireRole(["customer", "analyst", "admin"]), (req, res) => {
  const accounts = req.auth?.role === "customer"
    ? [...store.accounts.values()].filter((a) => a.userId === req.auth?.userId)
    : [...store.accounts.values()];
  res.json(accounts);
});

router.get("/:id", requireRole(["customer", "analyst", "admin"]), (req, res) => {
  const accountId = String(req.params.id);
  const account = store.accounts.get(accountId);
  if (!account) {
    throw new AppError(404, "Account not found");
  }
  if (req.auth?.role === "customer" && account.userId !== req.auth.userId) {
    throw new AppError(403, "Not permitted for this account");
  }
  res.json(account);
});

export const accountsRouter = router;
