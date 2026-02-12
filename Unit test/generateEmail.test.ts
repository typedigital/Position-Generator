import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import type { ExtractedIssue } from "../src/utils/githubData.js";


jest.unstable_mockModule("../src/config/config.js", () => ({
  default: {
    CUSTOMER_EMAIL: "client@example.com",
    EMAIL_USER: "manager@example.com",
    PIPEDRIVE_API_KEY: "mock-api-key",
  },
}));


global.fetch = jest.fn() as any;
const mockedFetch = global.fetch as jest.Mock<any>;

// Dynamic import to ensure mocks are hoisted
const { createPipedriveDeal } = await import("../src/services/pipedriveService.js");

describe("FEATURE: Pipedrive Deal Creation & Integration", () => {
  beforeEach(() => {
    mockedFetch.mockClear();
  });

  describe("SCENARIO: Successful Creation Waterfall", () => {
    test("GIVEN existing Pipedrive records, WHEN createPipedriveDeal is called, THEN it should link and create the deal", async () => {
      // GIVEN
      mockedFetch
        .mockResolvedValueOnce({ // Search Org
          json: async () => ({ success: true, data: { items: [{ item: { id: 200, name: "PosGenTS" } }] } }) 
        })
        .mockResolvedValueOnce({ //Search Person
          json: async () => ({ success: true, data: { items: [{ item: { id: 1001 } }] } }) 
        })
        .mockResolvedValueOnce({ // Update Person (PUT)
          json: async () => ({ success: true }) 
        })
        .mockResolvedValueOnce({ 
          json: async () => ({ success: true, data: [{ id: 8877 }] }) 
        })
        .mockResolvedValueOnce({ // Deal
          json: async () => ({ success: true, data: { id: 500 } }) 
        })
        .mockResolvedValueOnce({ //  Note
          json: async () => ({ success: true }) 
        });

      const inputData: ExtractedIssue = {
        title: "Fix logic",
        number: 42,
        fullDescription: "AI text description",
        status: "open",
        author: "vasian",
        repo: "vasian/PosGenTS",
        url: "https://github.com/vasian/PosGenTS/issues/42",
        created: "2024-02-11T00:00:00Z",
        labels: "bug",
        assignees: "none",
        comment: "Fix this ASAP"
      };

      // WHEN
      const result = await createPipedriveDeal(inputData);

      // THEN
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(500);

      // Verify Org Search
      const orgSearchCall = mockedFetch.mock.calls[0];
      expect(orgSearchCall[0]).toContain("term=PosGenTS");

      // Verify Person Linking (PUT request)
      const personUpdateCall = mockedFetch.mock.calls.find(
        (call: any) => call[1]?.method === "PUT"
      );
      expect(personUpdateCall).toBeDefined();
      const updateBody = JSON.parse((personUpdateCall![1] as any).body);
      expect(updateBody.org_id).toBe(200);

      // Verify Deal Payload
      const dealCall = mockedFetch.mock.calls.find(
        (call: any) => call[1]?.method === "POST" && call[0].includes("/deals")
      );
      expect(dealCall).toBeDefined();
      const dealBody = JSON.parse((dealCall![1] as any).body);
      expect(dealBody.person_id).toBe(1001);
      expect(dealBody.org_id).toBe(200);
      expect(dealBody.user_id).toBe(8877);
    });
  });

  describe("SCENARIO: Error Handling", () => {
    test("GIVEN a network failure, WHEN createPipedriveDeal is called, THEN it should throw an error", async () => {
      // GIVEN
      mockedFetch.mockRejectedValueOnce(new Error("API Down"));
      const input = { repo: "test/repo" };

      // WHEN / THEN
      await expect(createPipedriveDeal(input as any)).rejects.toThrow("API Down");
    });
  });
});