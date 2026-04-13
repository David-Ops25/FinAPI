# FinTrust Banking API

Production-style secure backend API simulation for core banking operations.

## Features
- JWT auth with short-lived access token + refresh token rotation.
- RBAC + least privilege for customer, analyst, admin.
- Account lockout + password complexity enforcement.
- Secure transfer flow with amount limits, balance checks, idempotency keys, API key layer.
- Structured JSON audit logs for security/compliance visibility.
- OpenAPI docs at `/docs`.
- Dockerized runtime and CI security gates (lint, tests, SAST, npm audit).

## Quick start
1. Copy `.env.example` to `.env` and set strong values.
2. Install dependencies:
   - `npm ci`
3. Run in dev:
   - `npm run dev`
4. Open docs:
   - `http://localhost:8080/docs`

## Authentication flow
1. `POST /auth/register`
2. `POST /auth/login` -> returns `accessToken`, `refreshToken`, `refreshJti`
3. Access secured APIs with `Authorization: Bearer <accessToken>`
4. Rotate session with `POST /auth/refresh`
5. Revoke with `POST /auth/logout`

## Example requests
```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@fintrust.test","password":"Str0ng!Password1","role":"customer"}'
```

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@fintrust.test","password":"Str0ng!Password1"}'
```

```bash
curl http://localhost:8080/accounts \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

```bash
curl -X POST http://localhost:8080/transfers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "x-api-key: YOUR_EXTERNAL_API_KEY" \
  -H "Idempotency-Key: 8bbad50c-922d-4f90-b95c-3ec577e4b9b1" \
  -d '{"fromAccountId":"UUID","toAccountId":"UUID","amount":200,"transactionSignature":"mock-signature-hex-1234567890abcdef1234567890abcdef"}'
```

## DevSecOps checks
- Lint: `npm run lint`
- Unit tests: `npm test`
- SAST rules: `npm run security:sast`
- Dependency scan: `npm run security:audit`
- Build: `npm run build`

## Container security
- Build image: `docker build -t fintrust-api .`
- Run as non-root user via Dockerfile runtime stage.
- Suggested image scan: `trivy image fintrust-api`

## Secret management guidance
- Do not commit `.env`.
- Use environment injection from AWS Secrets Manager / HashiCorp Vault / Azure Key Vault in production.
- Rotate JWT and API key secrets regularly and monitor access.

## Disclaimer
This project uses synthetic/mock data and in-memory persistence for demonstration.
