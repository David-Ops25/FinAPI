# SECURITY: FinTrust Banking API

## Security architecture decisions
- **Trust boundaries:** Public API edge, authenticated customer/staff zone, privileged admin operations.
- **Identity:** JWT short-lived access tokens + rotated refresh tokens with server-side revocation tracking.
- **Authorization:** RBAC (`customer`, `analyst`, `admin`) and least-privilege route guards.
- **Credential handling:** Passwords hashed with Argon2id; plaintext credentials are never persisted.
- **Abuse prevention:** Global rate limiting and account lockout after repeated failed logins.
- **Input/output controls:** Zod schema validation, constrained payload sizes, centralized error handling to prevent leakage.
- **Transport hardening:** HTTPS-only assumption plus strict security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- **Auditability:** Structured JSON audit logs for login attempts, transfers, and security events.
- **Data protection:** Masked account numbers, synthetic data only, no sensitive token/password logging.

## Threat model (STRIDE)
### Spoofing
- **Threat:** Credential stuffing, forged JWT, API key abuse.
- **Mitigations:** Strong password policy, account lockout, signed JWT with separate secrets, API-key middleware for transfer endpoint.

### Tampering
- **Threat:** Malicious request body changes and transfer replay.
- **Mitigations:** Zod validation, JWT signature verification, idempotency-key replay protection.

### Repudiation
- **Threat:** User denies initiating transfer/login attempt.
- **Mitigations:** Structured immutable-like audit events with actor, timestamp, status, metadata.

### Information disclosure
- **Threat:** Sensitive data leakage via logs/errors.
- **Mitigations:** Pino redaction, generic error responses, masked account number fields.

### Denial of service
- **Threat:** Request floods and brute-force login attempts.
- **Mitigations:** Rate limiting, lockout policy, capped request body size.

### Elevation of privilege
- **Threat:** Customer attempts analyst/admin-only functions.
- **Mitigations:** Explicit RBAC middleware checks and account ownership validation.

## Known limitations
- In-memory storage is not durable and not suitable for production.
- JWT revocation list and idempotency cache are memory-backed; restart clears state.
- Transaction signing is simulated with a validated signature field, not cryptographic verification.

## Hardening recommendations
- Move to PostgreSQL with row-level security and encrypted-at-rest storage.
- Store refresh tokens hashed in DB and rotate on every refresh.
- Integrate AWS Secrets Manager, Vault, or Azure Key Vault for secret retrieval at runtime.
- Add mTLS/service mesh controls for internal service communication.
- Add WAF, DDoS protection, and centralized SIEM forwarding.
- Add Semgrep, Trivy, and SCA gates beyond npm audit in CI.
