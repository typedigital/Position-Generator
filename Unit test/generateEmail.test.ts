import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import fs from "fs"; 
import nodemailer from "nodemailer";

jest.unstable_mockModule("../src/config/config.js", () => ({
  default: {
    EMAIL_USER: "sender@example.com",
    EMAIL_PASS: "password123",
    CUSTOMER_EMAIL: "customer@example.com",
  },
}));


const existsSpy = jest.spyOn(fs, "existsSync");
const readSpy = jest.spyOn(fs, "readFileSync");


const mockSendMail = jest.fn() as jest.Mock<any>;
jest.spyOn(nodemailer, "createTransport").mockReturnValue({
  sendMail: mockSendMail,
} as any);

describe("FEATURE: Email Service Integration", () => {
  const mockData = {
    number: "101",
    title: "Test Offer",
    fullDescription: "Detailed description text",
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

 
  async function getFreshService() {
    return await import(`../src/services/emailService.js?cb=${Math.random()}`);
  }

  describe("FUNCTION: generateEmailHtml", () => {
    test("GIVEN a valid issue and an existing HTML template, WHEN the email HTML is generated, THEN it should replace placeholders with issue data", async () => {
      // GIVEN
      existsSpy.mockReturnValue(true);
      readSpy.mockReturnValue("<html>{{title}} - {{ptValue}}</html>");
      const { generateEmailHtml } = await getFreshService();

      // WHEN
      const html = generateEmailHtml(mockData);

      // THEN
      expect(html).toContain("Test Offer");
      expect(html).toContain("IT 500");
    });

    test("GIVEN a missing template file, WHEN the email generation is triggered, THEN it should return an error message instead of HTML", async () => {
      // GIVEN
      existsSpy.mockReturnValue(false);
      const { generateEmailHtml } = await getFreshService();

      // WHEN
      const html = generateEmailHtml(mockData);

      // THEN
      expect(html).toContain("Error creating preview");
      expect(html).toContain("Template not found");
    });
  });

  describe("FUNCTION: sendEmail", () => {
    test("GIVEN a valid HTML content, WHEN the email is sent successfully via SMTP, THEN it should return a success status and a message ID", async () => {
      // GIVEN
      const { sendEmail } = await getFreshService();
      mockSendMail.mockResolvedValueOnce({ messageId: "mock-id-123" });
      const htmlContent = "<h1>Test</h1>";

      // WHEN
      const result = await sendEmail(htmlContent, "101", "PosGenTS");

      // THEN
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("mock-id-123");
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        html: htmlContent,
        subject: expect.stringContaining("Offer #101")
      }));
    });

    test("GIVEN a network or authentication failure, WHEN the email send fails, THEN it should return a failure status and the error message", async () => {
      // GIVEN
      const { sendEmail } = await getFreshService();
      mockSendMail.mockRejectedValueOnce(new Error("SMTP Error"));

      // WHEN
      const result = await sendEmail("<h1>Test</h1>", "101", "PosGenTS");

      // THEN
      expect(result.success).toBe(false);
      expect(result.error).toBe("SMTP Error");
    });
  });
});