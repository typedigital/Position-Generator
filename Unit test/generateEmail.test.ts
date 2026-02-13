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

const { createPipedriveDeal } = await import("../src/services/pipedriveService.js");

describe("FEATURE: Pipedrive Deal Creation & Integration", () => {
  beforeEach(() => {
    mockedFetch.mockClear();
  });

  describe("SCENARIO: Successful Creation Waterfall", () => {
    test("GIVEN existing records, WHEN createPipedriveDeal is called, THEN it should link and create correctly", async () => {
      /**
       * MOCK WATERFALL ORDER:
       * 1. getExistingFieldHash -> GET /dealFields (Returns array)
       * 2. getExistingFieldHash -> PUT /dealFields/1 (Visibility update)
       * 3. getOrganizationByRepo -> GET /organizations/search (Finds org 200)
       * 4. createPipedriveDeal   -> GET /persons/search (Finds person 1001)
       * 5. createPipedriveDeal   -> POST /deals (Creates deal 500)
       */
      mockedFetch
        // 1. Field search (getExistingFieldHash)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: [{ id: 1, name: "Details", key: "hash_details_123" }],
          }),
        })
        // 2. Field visibility update (getExistingFieldHash)
        .mockResolvedValueOnce({ json: async () => ({ success: true }) })
        
        // 3. Organization search (getOrganizationByRepo)
        .mockResolvedValueOnce({
          json: async () => ({ 
            success: true, 
            data: { items: [{ item: { id: 200, name: "PosGenTS" } }] } 
          }),
        })

        // 4. Person Search
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: {
              items: [{ item: { id: 1001 } }],
            },
          }),
        })

        // 5. Deal Creation
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: { id: 500 },
          }),
        });

      const inputData: Partial<ExtractedIssue> = {
        title: "Fix logic",
        repo: "vasian/PosGenTS",
        fullDescription: "AI text description",
      };

      // WHEN
      const result = await createPipedriveDeal(inputData);

      // THEN
      expect(result.data.id).toBe(500);

      // Verify final payload uses the dynamic hash and correct IDs
      const calls = mockedFetch.mock.calls;
      const dealCall = calls.find((c) => (c[0] as string).includes("/deals"));
      const dealBody = JSON.parse((dealCall![1] as any).body);
      
      expect(dealBody.person_id).toBe(1001);
      expect(dealBody.org_id).toBe(200);
      expect(dealBody.hash_details_123).toBe("AI text description");
    });
  });

  describe("SCENARIO: Error Handling", () => {
    test("GIVEN a network failure, WHEN createPipedriveDeal is called, THEN it should throw an error", async () => {
      /**
       * Because getExistingFieldHash has a try/catch that returns null,
       * it "swallows" the first error. We need to mock the next critical
       * function (Organization Search) to fail to trigger the throw.
       */
      mockedFetch
        .mockResolvedValueOnce({ json: async () => ({ success: false }) }) // Field hash fails gracefully
        .mockRejectedValueOnce(new Error("API Down")); // Org search fails and throws

      await expect(createPipedriveDeal({ repo: "test" } as any)).rejects.toThrow("API Down");
    });
  });
});