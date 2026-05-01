import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("Transfers", () => {
  const apiKeyHeader = process.env.API_KEY_HEADER ?? "x-api-key";
  const apiKeyValue = process.env.EXTERNAL_API_KEY!;
  let accessToken = "";
  let fromAccountId = "";
  let toAccountId = "";

  beforeAll(async () => {
    const emailA = `a-${Date.now()}@fintrust.test`;
    const emailB = `b-${Date.now()}@fintrust.test`;
    const password = "Str0ng!Password1";
    await request(app).post("/auth/register").send({ email: emailA, password }).expect(201);
    await request(app).post("/auth/register").send({ email: emailB, password }).expect(201);
    const loginA = await request(app).post("/auth/login").send({ email: emailA, password }).expect(200);
    const loginB = await request(app).post("/auth/login").send({ email: emailB, password }).expect(200);
    accessToken = loginA.body.accessToken;
    const accA = await request(app).get("/accounts").set("Authorization", `Bearer ${accessToken}`).expect(200);
    const accB = await request(app).get("/accounts").set("Authorization", `Bearer ${loginB.body.accessToken}`).expect(200);
    fromAccountId = accA.body[0].id;
    toAccountId = accB.body[0].id;
  });

  it("rejects transfer without idempotency key when otherwise authorized", async () => {
    await request(app)
      .post("/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .set(apiKeyHeader, apiKeyValue)
      .send({
        fromAccountId,
        toAccountId,
        amount: 10,
        transactionSignature: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      })
      .expect(400);
  });

  it("executes transfer with idempotency replay", async () => {
    const idem = randomUUID();
    const body = {
      fromAccountId,
      toAccountId,
      amount: 25,
      transactionSignature: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    };
    const first = await request(app)
      .post("/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .set(apiKeyHeader, apiKeyValue)
      .set("Idempotency-Key", idem)
      .send(body)
      .expect(201);
    expect(first.body.transactionId).toBeDefined();
    const second = await request(app)
      .post("/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .set(apiKeyHeader, apiKeyValue)
      .set("Idempotency-Key", idem)
      .send(body)
      .expect(200);
    expect(second.body.idempotentReplay).toBe(true);
  });

  it("flags large transfers for fraud review (threshold from env in tests)", async () => {
    const idem = randomUUID();
    const res = await request(app)
      .post("/transfers")
      .set("Authorization", `Bearer ${accessToken}`)
      .set(apiKeyHeader, apiKeyValue)
      .set("Idempotency-Key", idem)
      .send({
        fromAccountId,
        toAccountId,
        amount: 500,
        transactionSignature: "cccccccccccccccccccccccccccccccc"
      })
      .expect(201);
    expect(res.body.fraudReviewRecommended).toBe(true);
    expect(res.body.fraudFlags).toContain("LARGE_AMOUNT_THRESHOLD");
  });
});
