# Security — FinTrust Secure Platform

## Purpose
FinTrust Secure Platform is a **reference** Open Banking–style API intended for public review, education, and DevSecOps demonstration. It is **not** a certified payment system; treat data as synthetic.

## Architecture (concise)
- **Edge / transport:** TLS is assumed to be enforced by your ingress or platform. The app sets strict security headers (Helmet), disables `X-Powered-By`, and applies a **CORS allowlist** (`ALLOWED_ORIGINS`, comma-separated) with `credentials: true` to support HttpOnly refresh cookies.
- **Identity:** Short-lived **JWT access tokens** (`ACCESS_TOKEN_TTL`, default `10m`) and **rotating refresh tokens** signed with a **separate** secret. Refresh tokens are tracked server-side by `jti` with explicit revocation on rotation.
- **Browser binding:** Refresh tokens are issued primarily via **`HttpOnly` cookies** (`REFRESH_COOKIE_NAME`, default `fintrust_refresh`, `Path=/auth`). JSON responses intentionally **do not** echo refresh token material.
- **Channel binding (demo):** `POST /transfers` requires an additional **`EXTERNAL_API_KEY`** header (`API_KEY_HEADER`, default `x-api-key`) to simulate a confidential TPP / back-office channel distinct from the end-user bearer token.
- **Authorization:** RBAC with roles **`user`** and **`admin`**, enforced via middleware on every router. Public registration creates **`user`** only.
- **Credential storage:** Passwords hashed with **Argon2id**; plaintext passwords are never stored.
- **Abuse controls:** Global rate limiting, **stricter limits on `/auth/login`**, **stricter limits on `/transfers`**, **account lockout** after repeated failed password verifications, and bounded JSON body size (`1mb`).
- **Validation:** **Zod** on all request surfaces; production responses avoid detailed validation dumps.
- **Financial controls:** Balance checks, **daily outbound limits**, **per-transfer ceilings**, **`Idempotency-Key`** replay protection, and **fraud simulation flags** (non-blocking in this reference).
- **Logging:** **Pino** with redaction of secrets; **`pino-http` `customSuccessObject` / `customErrorObject`** strip the serialized `res` object from automatic access logs so refresh `Set-Cookie` values never enter log sinks; audit events for auth, transfers, and security-relevant failures.

## STRIDE mapping (summary)
| STRIDE | Primary mitigations |
|--------|---------------------|
| Spoofing | Argon2id, JWT signatures, API key for transfers, login rate limits, lockout |
| Tampering | Zod validation, JWT verification, idempotent transfers, refresh rotation |
| Repudiation | Structured audit events with actor, type, timestamp, bounded metadata |
| Information disclosure | Redacted logs, masked account display, generic 500s, production Zod responses |
| Denial of service | Rate limits, body size cap, horizontal scale + WAF recommended externally |
| Privilege escalation | RBAC middleware, account ownership checks, admin-only `/admin` routes |

## Known limitations (read before production use)
- **In-memory persistence** loses all state on restart (users, balances, idempotency, refresh revocation, audit buffer).
- **No distributed rate limiting** (single-process counters); put a gateway or Redis-backed limiter in front for real deployments.
- **No DB-backed refresh hashing** in this reference branch (required for production-grade refresh handling).
- **Fraud logic** is heuristic and illustrative only.

## Reporting vulnerabilities
Please open a private security advisory with reproduction steps, affected component, and impact analysis. Do **not** attach real credentials or customer data.

## Secure development checklist
- Copy `.env.example` → `.env` and generate strong random secrets (`openssl rand -hex 32`).
- Never commit `.env` or real API keys.
- Run `npm run lint`, `npm test`, `npm audit --audit-level=high`, and container scans (`trivy`) before publishing images.

For the full architecture narrative, control reasoning, STRIDE detail, CI explanation, and residual risk register, see **`FINTRUST_SECURITY_REPORT.txt`**.
