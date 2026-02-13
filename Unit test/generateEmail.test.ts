import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import fs from "fs"; // Import the standard module
import nodemailer from "nodemailer";

/**
 * 1. MOCK CONFIG (ESM)
 */
jest.unstable_mockModule("../src/config/config.js", () => ({
  default: {
    EMAIL_USER: "sender@example.com",
    EMAIL_PASS: "password123",
    CUSTOMER_EMAIL: "customer@example.com",
  },
}));

/**
 * 2. Setup Spies on fs BEFORE the service is imported.
 * spyOn works better than jest.mock for built-in ESM modules.
 */
const existsSpy = jest.spyOn(fs, "existsSync");
const readSpy = jest.spyOn(fs, "readFileSync");

/**
 * 3. Mock Nodemailer
 */
const mockSendMail = jest.fn() as jest.Mock<any>;
jest.spyOn(nodemailer, "createTransport").mockReturnValue({
  sendMail: mockSendMail,
} as any);

describe("FEATURE: Email Service Integration", () => {
  const mockData = {
    number: "101",
    title: "Test Offer",
    fullDescription: "Description text",
    status: "Open",
    author: "vasian",
    repo: "PosGenTS",
    url: "https://github.com/...",
    created: "2024-02-13T10:00:00Z",
    parsedEntries: [{ dept: "IT", num: "500" }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Use a query parameter to bypass the module cache.
   * This ensures 'cachedTemplate' is reset to null for every test.
   */
  async function getFreshService() {
    return await import(`../src/services/emailService.js?cb=${Math.random()}`);
  }

  describe("FUNCTION: generateEmailHtml", () => {
    test("SCENARIO: Should replace placeholders correctly", async () => {
      // 1. Set spy values
      existsSpy.mockReturnValue(true);
      readSpy.mockReturnValue("<html>{{title}} - {{ptValue}}</html>");

      // 2. Import service
      const { generateEmailHtml } = await getFreshService();
      
      const html = generateEmailHtml(mockData);
      expect(html).toContain("Test Offer");
      expect(html).toContain("IT 500");
    });

    test("SCENARIO: Should return error HTML if template file is missing", async () => {
      // 1. Set spy values
      existsSpy.mockReturnValue(false);

      // 2. Import service
      const { generateEmailHtml } = await getFreshService();

      const html = generateEmailHtml(mockData);
      expect(html).toContain("Error creating preview");
      expect(html).toContain("Template not found");
    });
  });

  describe("FUNCTION: sendEmail", () => {
    test("SCENARIO: Success path returns messageId", async () => {
      const { sendEmail } = await getFreshService();
      mockSendMail.mockResolvedValueOnce({ messageId: "mock-id-123" });

      const result = await sendEmail("<h1>Content</h1>", "101", "PosGenTS");
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("mock-id-123");
    });
  });
});