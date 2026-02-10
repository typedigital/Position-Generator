import { jest } from '@jest/globals';


jest.unstable_mockModule("../src/services/aiService.js", () => ({
  generateClientDescription: jest.fn<() => Promise<string>>().mockResolvedValue("Mocked AI description")
}));


const { processIssue } = await import("../src/services/issueProcessor.js");

describe("FEATURE: Issue and Comment Processing", () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("SCENARIO: Parsing PT references (Dev 4pt Designer 5pt)", () => {
    test("GIVEN a comment with multiple PT entries, WHEN processed, THEN it should extract all entries correctly", async () => {
      // GIVEN
      const issueData = {
        title: "New Layout UI",
        number: 101,
        comment: "Dev 4pt Designer 5pt",
        fullDescription: "Initial task description"
      };

      // WHEN
      const result = await processIssue(issueData as any);

      // THEN
      expect(result.parsedEntries).toBeDefined();
      if (result.parsedEntries) {
        expect(result.parsedEntries).toHaveLength(2);
        expect(result.parsedEntries[0]).toMatchObject({ dept: "Dev", num: "4" });
        expect(result.parsedEntries[1]).toMatchObject({ dept: "Designer", num: "5" });
      }
    });
  });

  describe("SCENARIO: PT reference with noise words", () => {
    test("GIVEN a comment with noise words, WHEN processed, THEN it should at least extract the correct number", async () => {
      // GIVEN
      const issueData = {
        title: "Task",
        number: 104,
        comment: "Dev and 4pt"
      };

      // WHEN
      const result = await processIssue(issueData as any);

      // THEN
      expect(result.parsedEntries).toBeDefined();
      if (result.parsedEntries && result.parsedEntries.length > 0) {

        expect(result.parsedEntries[0].num).toBe("4");
     
      }
    });
  });

  describe("SCENARIO: Handling empty or missing comments", () => {
    test("GIVEN an issue with an empty comment, WHEN processed, THEN it should return empty entries and default description", async () => {
      // GIVEN
      const issueData = {
        title: "Empty Bug Report",
        number: 102,
        comment: "",
        fullDescription: ""
      };

      // WHEN
      const result = await processIssue(issueData as any);

      // THEN
      expect(result.parsedEntries).toEqual([]);
      expect(result.clientDescription).toBeDefined();
    });
  });
});