import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("Auth", () => {
  const email = "customer@fintrust.test";
  const password = "Str0ng!Password1";
  let refreshToken = "";

  beforeAll(async () => {
    await request(app).post("/auth/register").send({ email, password, role: "customer" }).expect(201);
  });

  it("logs in and returns tokens", async () => {
    const res = await request(app).post("/auth/login").send({ email, password }).expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    refreshToken = res.body.refreshToken;
  });

  it("rotates refresh token", async () => {
    const res = await request(app).post("/auth/refresh").send({ refreshToken }).expect(200);
    expect(res.body.accessToken).toBeDefined();
  });
});
