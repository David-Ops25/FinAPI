import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  ACCESS_TOKEN_TTL: z.string().default("10m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
  LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(120).default(15),
  TRANSFER_DAILY_LIMIT: z.coerce.number().positive().default(50000),
  TRANSFER_SINGLE_LIMIT: z.coerce.number().positive().default(10000),
  ALLOWED_ORIGINS: z.string().default("https://localhost:3000"),
  API_KEY_HEADER: z.string().default("x-api-key"),
  EXTERNAL_API_KEY: z.string().min(16)
});

export const env = envSchema.parse(process.env);
