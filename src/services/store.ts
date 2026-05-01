import { v4 as uuidv4 } from "uuid";
import { Account, AuditLogEvent, RefreshTokenRecord, Transaction, User } from "../types/domain";

class InMemoryStore {
  users = new Map<string, User>();
  usersByEmail = new Map<string, string>();
  accounts = new Map<string, Account>();
  transactions = new Map<string, Transaction>();
  refreshTokens = new Map<string, RefreshTokenRecord>();
  idempotencyTransfers = new Map<string, string>();
  auditLogs: AuditLogEvent[] = [];

  createUser(user: Omit<User, "id" | "createdAt" | "failedLoginAttempts" | "lockedUntil" | "mfaTotpSecretEnc" | "mfaEnabled">): User {
    const created: User = {
      ...user,
      mfaTotpSecretEnc: null,
      mfaEnabled: false,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      failedLoginAttempts: 0,
      lockedUntil: null
    };
    this.users.set(created.id, created);
    this.usersByEmail.set(created.email, created.id);
    return created;
  }
}

export const store = new InMemoryStore();
