import dotenv from "dotenv";
import { z } from "zod";
import { durationStringToMs } from "../utils/time";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  /** Access token lifetime (JWT `expiresIn` format, e.g. 5m–15m). */
  ACCESS_TOKEN_TTL: z.string().default("10m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
  LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(120).default(15),
  TRANSFER_DAILY_LIMIT: z.coerce.number().positive().default(50000),
  TRANSFER_SINGLE_LIMIT: z.coerce.number().positive().default(10000),
  /** Amount at or above which a transfer is flagged for fraud review (simulation). */
  FRAUD_LARGE_AMOUNT_THRESHOLD: z.coerce.number().positive().default(5000),
  /** Max outbound transfers per account per rolling hour before velocity flag. */
  FRAUD_VELOCITY_MAX_PER_HOUR: z.coerce.number().int().min(1).max(50).default(5),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  API_KEY_HEADER: z.string().default("x-api-key"),
  EXTERNAL_API_KEY: z.string().min(16),
  /** HttpOnly refresh cookie name (simulates browser-bound refresh storage). */
  REFRESH_COOKIE_NAME: z.string().default("fintrust_refresh"),
  /** Global API rate limit (requests per window). */
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(100),
  /** Stricter limit for login attempts (per IP+email composite key). */
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(20),
  /** Stricter limit for transfer mutations (per authenticated user). */
  RATE_LIMIT_TRANSFER_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  /** Max registrations per IP per window (abuse / disposable account spam). */
  RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().positive().default(10),
  /**
   * Number of reverse-proxy hops to trust for `req.ip` (rate limits, audit). 0 = do not trust `X-Forwarded-For`.
   * Set to 1 when the API sits behind one trusted load balancer or ingress.
   */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  /** In production, OpenAPI UI is off unless explicitly enabled (reduces attack surface). */
  ENABLE_OPENAPI_DOCS: z.coerce.boolean().default(false),
  /** Optional 32-byte hex key (64 chars) for AES-256-GCM field encryption; if unset, a key is derived from JWT_REFRESH_SECRET (demo only). */
  FIELD_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/).optional()
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  REFRESH_TOKEN_TTL_MS: durationStringToMs(parsed.REFRESH_TOKEN_TTL)
};
