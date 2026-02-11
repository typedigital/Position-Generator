import { jest } from "@jest/globals";

jest.unstable_mockModule("fs", () => ({
  default: {
    readFileSync: jest
      .fn()
      .mockReturnValue(
        "<html><body>#{{issueNumber}} {{title}} {{ptValue}} {{date}}</body></html>",
      ),
    existsSync: jest.fn().mockReturnValue(true),
  },
  readFileSync: jest
    .fn()
    .mockReturnValue(
      "<html><body>#{{issueNumber}} {{title}} {{ptValue}} {{date}}</body></html>",
    ),
  existsSync: jest.fn().mockReturnValue(true),
}));

const { generateEmailHtml } = await import("../src/services/emailService.js");

describe("FEATURE: HTML Email Generation & Formatting", () => {
  describe("SCENARIO: Successful Generation", () => {
    test("GIVEN a valid dataset, WHEN generateEmailHtml is called, THEN it should return the formatted HTML", () => {
      // GIVEN
      const data = {
        number: 101,
        title: "Test Issue",
        fullDescription: "Description text",
        status: "open",
        author: "vasian",
        repo: "PosGenTS",
        url: "http://github.com",
        created: "2026-02-10T12:00:00Z",
        parsedEntries: [{ dept: "IT", num: "10" }],
      };

      // WHEN
      const html = generateEmailHtml(data as any);

      // THEN
      expect(html).toContain("#101");
      expect(html).toContain("Test Issue");
      expect(html).toContain("IT 10");
      expect(html).toContain("10.02.2026");
    });
  });

  describe("SCENARIO: Error Handling", () => {
    test("GIVEN a null input, WHEN generated, THEN it should return a basic error message", () => {
      // GIVEN
      const input = null;
      // WHEN
      const html = generateEmailHtml(input);
      // THEN
      expect(html).toContain("Error: No data available.");
    });
  });
});
