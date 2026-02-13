import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import type { ExtractedIssue } from "../src/utils/githubData.js";

jest.unstable_mockModule("../src/config/config.js", () => ({
  default: {
    CUSTOMER_EMAIL: "client@example.com",
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
       * FETCH CALL ORDER:
       * 1. getExistingFieldHash("Details") -> GET /dealFields
       * 2. getExistingFieldHash("Details") -> PUT /dealFields/1
       * 3. getExistingFieldHash("Source channel ID") -> GET /dealFields
       * 4. getExistingFieldHash("Source channel ID") -> PUT /dealFields/2
       * 5. getOrganizationByRepo -> GET /organizations/search
       * 6. createPipedriveDeal -> GET /persons/search
       * 7. createPipedriveDeal -> POST /deals
       */
      mockedFetch
        // 1 & 2: Details Field Handling
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: [{ id: 1, name: "Details", key: "hash_details_123" }] }),
        })
        .mockResolvedValueOnce({ json: async () => ({ success: true }) })
        
        // 3 & 4: Source channel ID Field Handling
        .mockResolvedValueOnce({
          json: async () => ({ success: true, data: [{ id: 2, name: "Source channel ID", key: "hash_source_456" }] }),
        })
        .mockResolvedValueOnce({ json: async () => ({ success: true }) })

        // 5. Organization search
        .mockResolvedValueOnce({
          json: async () => ({ 
            success: true, 
            data: { items: [{ item: { id: 200, name: "PosGenTS" } }] } 
          }),
        })

        // 6. Person Search
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            data: { items: [{ item: { id: 1001 } }] },
          }),
        })

        // 7. Deal Creation
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

      const result = await createPipedriveDeal(inputData);

      expect(result.data.id).toBe(500);

      const dealCall = mockedFetch.mock.calls.find((c) => (c[0] as string).includes("/deals"));
      const dealBody = JSON.parse((dealCall![1] as any).body);
      
      expect(dealBody.person_id).toBe(1001);
      expect(dealBody.org_id).toBe(200);
      expect(dealBody.hash_source_456).toBe("GitHub");
    });
  });

  describe("SCENARIO: Error Handling", () => {
    test("GIVEN a network failure, WHEN createPipedriveDeal is called, THEN it should throw an error", async () => {
      // Mock both field searches to fail gracefully (because of your try/catch in service)
      // Then mock the Org search to throw the error that halts the service
      mockedFetch
        .mockResolvedValueOnce({ json: async () => ({ success: false }) }) // Details GET fail
        .mockResolvedValueOnce({ json: async () => ({ success: false }) }) // Source GET fail
        .mockRejectedValueOnce(new Error("API Down")); // Org Search crash

      await expect(createPipedriveDeal({ repo: "test" } as any)).rejects.toThrow("API Down");
    });
  });
});