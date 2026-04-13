import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { accountsRouter } from "./routes/accounts";
import { authRouter } from "./routes/auth";
import { transactionsRouter } from "./routes/transactions";
import { transfersRouter } from "./routes/transfers";

const app = express();
const openApiDocument = YAML.load("./openapi.yaml");

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
    noSniff: true
  })
);
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS.split(","),
    methods: ["GET", "POST"],
    credentials: false
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(
  pinoHttp({
    redact: ["req.headers.authorization", "req.body.password", "req.body.refreshToken"],
    autoLogging: true
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "fintrust-api" });
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use("/auth", authRouter);
app.use("/accounts", accountsRouter);
app.use("/transactions", transactionsRouter);
app.use("/transfers", transfersRouter);
app.use(errorHandler);

export { app };
