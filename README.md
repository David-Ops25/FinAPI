# FinTrust Secure Platform

Production-oriented, **security-hardened** Open Banking–style API reference (Node.js 22 + TypeScript). Suitable for **public repositories**, security architecture review, and **DevSecOps** demonstrations — not a certified core banking system.

## Highlights
- **JWT** access tokens (short TTL) + **rotating refresh** with server-side `jti` tracking; refresh delivered as **`HttpOnly` cookie** (`Path=/auth`).
- **Argon2id** password hashing, **complexity policy**, **account lockout**, and **login rate limiting**.
- **RBAC** (`user`, `admin`) with middleware enforcement on all routers; **API key** required for transfers.
- **Zod** validation everywhere; centralized error handling (no stack traces to clients in unexpected failures).
- **Transfers:** balance check, **daily limits**, **`Idempotency-Key`**, **fraud simulation flags** (large amount / velocity).
- **Observability:** **Pino** + structured audit channel; sensitive fields and `Set-Cookie` are not logged verbatim.
- **Container:** multi-stage **Dockerfile**, **non-root** user, **`HEALTHCHECK`**, `.dockerignore`.
- **CI:** GitHub Actions — lint, tests, SAST, **`npm audit --audit-level=high`**, **Trivy fs**, **Docker build**, **Trivy image** `fintrust-secure` (fails on **HIGH/CRITICAL**).

## Quick start
1. `cp .env.example .env` and set strong random values (no real secrets in git).
2. `npm ci`
3. `npm run dev`
4. OpenAPI UI: `http://localhost:8080/docs`  
5. Health: `GET /health`

## Authentication (summary)
1. `POST /auth/register` `{ "email", "password" }` → creates **`user`** + synthetic account.
2. `POST /auth/login` → JSON includes `accessToken` + `refreshJti`; refresh JWT is in **`Set-Cookie`**.
3. Call APIs with `Authorization: Bearer <accessToken>`.
4. `POST /auth/refresh` with the **agent cookie jar** (browser) **or** legacy `refreshToken` body for non-browser tests.
5. `POST /auth/logout` clears the refresh cookie and revokes the active refresh where possible.

## Example: transfer (requires API key + idempotency)
```bash
curl -X POST http://localhost:8080/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "x-api-key: YOUR_EXTERNAL_API_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"fromAccountId":"UUID","toAccountId":"UUID","amount":25,"transactionSignature":"0123456789abcdef0123456789abcdef"}'
```

## Security documentation
- **`SECURITY.md`** — public-facing summary + STRIDE table.  
- **`FINTRUST_SECURITY_REPORT.txt`** — detailed architecture, controls, STRIDE, residual risks, CI/CD, and production recommendations.

## Disclaimer
Synthetic data and **in-memory** persistence only. Use PostgreSQL (see `docker-compose.yml` `database` profile) and a real secrets manager before any regulated workload.
