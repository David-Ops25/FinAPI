export type Role = "user" | "admin";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  failedLoginAttempts: number;
  lockedUntil: number | null;
  createdAt: string;
  /** Encrypted TOTP seed (AES-256-GCM); null when MFA is off. */
  mfaTotpSecretEnc: string | null;
  mfaEnabled: boolean;
}

export interface Account {
  id: string;
  userId: string;
  accountNumberMasked: string;
  balance: number;
  currency: "USD";
}

export interface Transaction {
  id: string;
  accountId: string;
  type: "credit" | "debit" | "transfer";
  amount: number;
  description: string;
  createdAt: string;
  fraudFlags?: string[];
}

export interface RefreshTokenRecord {
  jti: string;
  userId: string;
  expiresAt: number;
  revoked: boolean;
}

export interface AuditLogEvent {
  id: string;
  eventType: string;
  actorUserId?: string;
  status: "success" | "failure";
  metadata: Record<string, string | number | boolean | null | string[]>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}
