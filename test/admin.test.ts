import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { hashPassword } from "../src/services/auth";
import { store } from "../src/services/store";

describe("Admin RBAC", () => {
  let adminToken = "";
  let userToken = "";

  beforeAll(async () => {
    const adminEmail = `admin-rbac-${Date.now()}@fintrust.test`;
    const adminPassword = "Adm!nStr0ngPass2";
    store.createUser({
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "admin"
    });
    const loginAdmin = await request(app).post("/auth/login").send({ email: adminEmail, password: adminPassword }).expect(200);
    adminToken = loginAdmin.body.accessToken;

    const userEmail = `user-rbac-${Date.now()}@fintrust.test`;
    const userPassword = "Str0ng!Password1";
    await request(app).post("/auth/register").send({ email: userEmail, password: userPassword }).expect(201);
    const loginUser = await request(app).post("/auth/login").send({ email: userEmail, password: userPassword }).expect(200);
    userToken = loginUser.body.accessToken;
  });

  it("denies audit log access to standard users", async () => {
    await request(app).get("/admin/audit-logs").set("Authorization", `Bearer ${userToken}`).expect(403);
  });

  it("allows admins to read audit logs with validated query", async () => {
    const res = await request(app)
      .get("/admin/audit-logs?limit=5&offset=0")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.items).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});
