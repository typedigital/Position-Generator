import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import type { ExtractedIssue } from "../src/utils/githubData.js";

// 1. Mock Config
jest.unstable_mockModule("../src/config/config.js", () => ({
  default: {
    CUSTOMER_EMAIL: "client@example.com",
    PIPEDRIVE_API_KEY: "mock-api-key",
  },
}));

global.fetch = jest.fn() as any;
const mockedFetch = global.fetch as jest.Mock<any>;

// 2. Import service AFTER mocking config
const { createPipedriveDeal } = await import("../src/services/pipedriveService.js");

describe("FEATURE: Pipedrive Deal Creation & Integration", () => {
  beforeEach(() => {
    mockedFetch.mockClear();
  });

  test("SCENARIO: Successful Creation Waterfall", async () => {
    /**
     * EXACT ORDER OF FETCH CALLS IN SERVICE:
     * 1. getExistingFieldHash -> GET /dealFields
     * 2. getExistingFieldHash -> PUT /dealFields/1 (Visibility update)
     * 3. getOrganizationByRepo -> GET /organizations/search
     * 4. createPipedriveDeal   -> GET /persons/search
     * 5. createPipedriveDeal   -> POST /deals
     */
    mockedFetch
      // 1. Field Search
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [{ id: 1, name: "Details", key: "hash_details_123" }] }),
      })
      // 2. Field Visibility PUT
      .mockResolvedValueOnce({ json: async () => ({ success: true }) })
      
      // 3. Org Search
      .mockResolvedValueOnce({
        json: async () => ({ 
          success: true, 
          data: { items: [{ item: { id: 200, name: "TestRepo" } }] } 
        }),
      })

      // 4. Person Search
      .mockResolvedValueOnce({
        json: async () => ({ 
          success: true, 
          data: { items: [{ item: { id: 1001 } }] } 
        }),
      })

      // 5. Deal Creation
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { id: 500 } }),
      });

    const inputData: Partial<ExtractedIssue> = {
      title: "Fix logic",
      repo: "vasian/PosGenTS",
      fullDescription: "AI text description"
    };

    const result = await createPipedriveDeal(inputData);

    expect(result.data.id).toBe(500);

    // Verify Custom Field Hash was used
    const dealCall = mockedFetch.mock.calls.find((c) => (c[0] as string).includes("/deals"));
    const dealBody = JSON.parse((dealCall![1] as any).body);
    expect(dealBody.hash_details_123).toBe("AI text description");
    expect(dealBody.org_id).toBe(200);
  });

  test("SCENARIO: Network Failure", async () => {
    /** * IMPORTANT: Because getExistingFieldHash catches its own errors, 
     * a failure there returns null but doesn't stop the service. 
     * To test a total failure, we mock the Org search to fail.
     */
    mockedFetch
      .mockResolvedValueOnce({ json: async () => ({ success: false }) }) // getExistingFieldHash fails gracefully
      .mockRejectedValueOnce(new Error("API Down")); // getOrganizationByRepo fails and throws

    await expect(createPipedriveDeal({} as any)).rejects.toThrow("API Down");
  });
});