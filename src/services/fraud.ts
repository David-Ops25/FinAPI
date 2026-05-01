import { env } from "../config/env";
import { store } from "./store";

/**
 * Simulated fraud/risk scoring: flags only; does not block settlement in this reference platform.
 */
export function evaluateTransferFraud(opts: { fromAccountId: string; amount: number }): string[] {
  const flags: string[] = [];
  if (opts.amount >= env.FRAUD_LARGE_AMOUNT_THRESHOLD) {
    flags.push("LARGE_AMOUNT_THRESHOLD");
  }

  const hourAgoMs = Date.now() - 60 * 60 * 1000;
  const recentOutbound = [...store.transactions.values()].filter((t) => {
    if (t.accountId !== opts.fromAccountId || t.type !== "transfer") return false;
    return new Date(t.createdAt).getTime() > hourAgoMs;
  }).length;

  if (recentOutbound >= env.FRAUD_VELOCITY_MAX_PER_HOUR) {
    flags.push("VELOCITY_EXCEEDED");
  }

  return flags;
}
