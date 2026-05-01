import { generateSync } from "otplib";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("MFA (TOTP)", () => {
  const email = `mfa-user-${Date.now()}@fintrust.test`;
  const password = "Str0ng!Password1";
  let secretFromSetup = "";

  beforeAll(async () => {
    await request(app).post("/auth/register").send({ email, password }).expect(201);
  });

  it("enrolls MFA, completes login with TOTP challenge", async () => {
    const login = await request(app).post("/auth/login").send({ email, password }).expect(200);
    const access = login.body.accessToken as string;
    expect(access).toBeDefined();

    const setup = await request(app).post("/auth/mfa/setup").set("Authorization", `Bearer ${access}`).expect(201);
    secretFromSetup = setup.body.secret as string;
    expect(secretFromSetup.length).toBeGreaterThan(10);

    const code = generateSync({ secret: secretFromSetup });
    await request(app).post("/auth/mfa/enable").set("Authorization", `Bearer ${access}`).send({ code }).expect(204);

    const login2 = await request(app).post("/auth/login").send({ email, password }).expect(200);
    expect(login2.body.mfaRequired).toBe(true);
    const mfaToken = login2.body.mfaToken as string;
    expect(mfaToken).toBeDefined();

    const code2 = generateSync({ secret: secretFromSetup });
    const done = await request(app).post("/auth/mfa/verify-login").send({ mfaToken, code: code2 }).expect(200);
    expect(done.body.accessToken).toBeDefined();
    expect(done.body.refreshJti).toBeDefined();
  });
});
