import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("Auth (FinTrust Secure Platform)", () => {
  const email = "user@fintrust.test";
  const password = "Str0ng!Password1";

  beforeAll(async () => {
    await request(app).post("/auth/register").send({ email, password }).expect(201);
  });

  it("logs in, returns access token in body and refresh in HttpOnly cookie", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/auth/login").send({ email, password }).expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshJti).toBeDefined();
    expect(res.headers["set-cookie"]).toBeDefined();
    const cookies = res.headers["set-cookie"] as string[];
    expect(cookies.some((c) => c.includes("HttpOnly"))).toBe(true);
  });

  it("rotates refresh token using cookie", async () => {
    const agent = request.agent(app);
    await agent.post("/auth/login").send({ email, password }).expect(200);
    const res = await agent.post("/auth/refresh").send({}).expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshJti).toBeDefined();
  });

  it("locks account after repeated failed logins", async () => {
    const lockEmail = `lock-${Date.now()}@fintrust.test`;
    await request(app).post("/auth/register").send({ email: lockEmail, password }).expect(201);
    for (let i = 0; i < 5; i += 1) {
      await request(app).post("/auth/login").send({ email: lockEmail, password: "wrong" }).expect(401);
    }
    await request(app).post("/auth/login").send({ email: lockEmail, password }).expect(423);
  });
});
