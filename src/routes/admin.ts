import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { store } from "../services/store";

const router = Router();
router.use(requireAuth, requireRole(["admin"]));

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  eventType: z.string().min(1).max(120).optional()
});

router.get("/audit-logs", (req, res) => {
  const q = auditQuerySchema.parse(req.query);
  let rows = [...store.auditLogs];
  if (q.eventType) {
    rows = rows.filter((r) => r.eventType === q.eventType);
  }
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const slice = rows.slice(q.offset, q.offset + q.limit);
  res.json({
    total: rows.length,
    limit: q.limit,
    offset: q.offset,
    items: slice
  });
});

export const adminRouter = router;
