import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { env } from "./config/env";
import { PINO_REDACT_PATHS, serializeErrorForServerLog } from "./security/mask-sensitive-data-in-logs-and-errors";
import { logger } from "./logger";
import { errorHandler } from "./middleware/error-handler";
import { accountsRouter } from "./routes/accounts";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { transactionsRouter } from "./routes/transactions";
import { transfersRouter } from "./routes/transfers";

const app = express();
const openApiDocument = YAML.load("./openapi.yaml");

if (env.TRUST_PROXY_HOPS > 0) {
  app.set("trust proxy", env.TRUST_PROXY_HOPS);
}

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    },
    frameguard: { action: "deny" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    referrerPolicy: { policy: "no-referrer" },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    crossOriginOpenerPolicy: { policy: "same-origin" }
  })
);
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", env.API_KEY_HEADER, "Idempotency-Key"]
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    /** Replace default success log shape so `res` headers (e.g. `Set-Cookie`) never enter access logs. */
    customSuccessObject: (req: Request, res: Response, loggableObject: Record<string, unknown>) => {
      const { res: serializedRes, ...rest } = loggableObject;
      void serializedRes;
      return {
        ...rest,
        statusCode: res.statusCode,
        path: req.path,
        method: req.method
      };
    },
    customErrorObject: (req: Request, res: Response, err: Error, loggableObject: Record<string, unknown>) => {
      const { res: serializedRes, ...rest } = loggableObject;
      void serializedRes;
      const safeErr = err instanceof Error ? err : new Error(String(err));
      return {
        ...rest,
        statusCode: res.statusCode,
        path: req.path,
        method: req.method,
        err: serializeErrorForServerLog(safeErr)
      };
    },
    autoLogging: true,
    redact: {
      paths: [...PINO_REDACT_PATHS],
      remove: true
    }
  })
);
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_GLOBAL_MAX,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "fintrust-secure-platform", version: "1.0.0" });
});
if (env.NODE_ENV !== "production" || env.ENABLE_OPENAPI_DOCS) {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
}
app.use("/auth", authRouter);
app.use("/accounts", accountsRouter);
app.use("/transactions", transactionsRouter);
app.use("/transfers", transfersRouter);
app.use("/admin", adminRouter);
app.use(errorHandler);

export { app };
