import { jest } from '@jest/globals';

const { processIssue } = await import("../src/services/issueProcessor.js");

describe("FEATURE: Issue and Comment Processing", () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe("SCENARIO: Handling issues with existing comments", () => {
    test("GIVEN an issue with a valid comment string, WHEN the issue is processed, THEN it should detect the comment and initialize parsedEntries", async () => {
      // GIVEN
      const issueData = {
        title: "Test Issue",
        number: 1,
        comment: "This is a test comment",
      };
      // WHEN
      const result = await processIssue(issueData as any);
      // THEN
      expect(result.comment).toBe("This is a test comment");
      expect(result.parsedEntries).toBeDefined();
      expect(result.parsedEntries).toEqual([]);
      expect(result.clientDescription).toBeDefined();
    });
  });

  describe("SCENARIO: Handling issues with empty comment strings", () => {
    test("GIVEN an issue where the comment is an empty string, WHEN the issue is processed, THEN it should return an empty parsedEntries array and a default client description", async () => {
      // GIVEN
      const issueData = {
        title: "Test Issue",
        number: 2,
        comment: "",
      };

      // WHEN
      const result = await processIssue(issueData as any);

      // THEN
      expect(result).toEqual({
        ...issueData,
        parsedEntries: [],
        clientDescription: "No issue description was provided.",
      });
    });
  });

  describe("SCENARIO: Handling issues where the comment field is missing", () => {
    test("GIVEN an issue object that does not contain a comment property, WHEN the issue is processed, THEN it should gracefully initialize parsedEntries and the default client description", async () => {
      // GIVEN
      const issueData = {
        title: "Test Issue",
        number: 3,
      };

      // WHEN
      const result = await processIssue(issueData as any);

      // THEN
      expect(result).toMatchObject({
        title: "Test Issue",
        number: 3,
        parsedEntries: [],
        clientDescription: "No issue description was provided.",
      });
    });
  });
});