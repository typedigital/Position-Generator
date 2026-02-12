import { jest } from '@jest/globals';
import request from "supertest";
import * as http from "node:http";
import * as crypto from "node:crypto";

/**
 * FEATURE: GitHub Webhook Security & Integration
 */

const { StatusCode } = await import("../src/constants/statusCode.js");

describe("FEATURE: GitHub Webhook Security & Integration", () => {
  let server: http.Server;
  const TEST_SECRET = "test_secret_123";

  beforeAll(async () => {
    process.env.GITHUB_WEBHOOK_SECRET = TEST_SECRET;
    process.env.GEMINI_API_KEY = "fake_key";

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { handleRequest } = await import("../src/server/server.js");
    server = http.createServer(handleRequest);
  });

  afterAll((done) => {
    (console.error as jest.Mock).mockRestore();
    (console.warn as jest.Mock).mockRestore();
    if (server && server.listening) server.close(done);
    else done();
  });

  describe("SCENARIO: Authenticated Webhook Delivery", () => {
    test("GIVEN a valid payload, WHEN signed with the correct secret, THEN the server should accept it", async () => {
      // GIVEN
      const payload = { issue: { title: "Test" }, repository: { full_name: "repo" } };
      const bodyString = JSON.stringify(payload);
      const hmac = crypto.createHmac("sha256", TEST_SECRET);
      const signature = `sha256=${hmac.update(bodyString).digest("hex")}`;

      // WHEN
      const response = await request(server)
        .post("/github/webhook")
        .set("x-hub-signature-256", signature)
        .set("Content-Type", "application/json")
        .send(bodyString);

      // THEN
      expect(response.status).toBe(StatusCode.SuccessOK);
      expect(response.body).toHaveProperty("status", "success");
    });
  });

  describe("SCENARIO: Unauthorized Delivery", () => {
    test("GIVEN an incoming request, WHEN the signature is incorrect, THEN it should return 401", async () => {
      // GIVEN
      const invalidSignature = "sha256=wrong_hash";
      // WHEN
      const response = await request(server).post("/github/webhook").set("x-hub-signature-256", invalidSignature).send("{}");
      // THEN
      expect(response.status).toBe(StatusCode.ClientErrorUnauthorized);
    });
  });

  describe("SCENARIO: Edge Cases", () => {
    test("GIVEN a non-existent URL, THEN it should return 404", async () => {
      const response = await request(server).get("/unknown-route");
      expect(response.status).toBe(StatusCode.ClientErrorNotFound);
    });

    test("GIVEN an oversized payload, THEN it should return 413", async () => {
      const hugeBody = "a".repeat(2 * 1024 * 1024); 
      const response = await request(server).post("/github/webhook").send(hugeBody);
      expect(response.status).toBe(StatusCode.ClientErrorPayloadTooLarge);
    });
  });
});