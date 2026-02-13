import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import type { ExtractedIssue } from "../src/utils/githubData.js";

// Mock Configuration
jest.unstable_mockModule("../src/config/config.js", () => ({
  default: {
    CUSTOMER_EMAIL: "client@example.com",
    PIPEDRIVE_API_KEY: "mock-api-key",
  },
}));

global.fetch = jest.fn() as any;
const mockedFetch = global.fetch as jest.Mock<any>;

// Import service after mocks are defined
const { createPipedriveDeal } = await import("../src/services/pipedriveService.js");

describe("FEATURE: Pipedrive Deal Creation & Integration", () => {
  beforeEach(() => {
    mockedFetch.mockClear();
  });

  test("SCENARIO: Successful Creation Waterfall", async () => {
    /**
     * FETCH CALL SEQUENCE:
     * 1. GET /dealFields (Details)
     * 2. PUT /dealFields/1 (Visibility)
     * 3. GET /dealFields (Source channel ID)
     * 4. PUT /dealFields/2 (Visibility)
     * 5. GET /organizations/search
     * 6. GET /persons/search
     * 7. POST /deals
     */
    mockedFetch
      // 1 & 2: Details Field
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [{ id: 1, name: "Details", key: "hash_details_123" }] }) })
      .mockResolvedValueOnce({ json: async () => ({ success: true }) })
      
      // 3 & 4: Source channel ID Field
      .mockResolvedValueOnce({ json: async () => ({ success: true, data: [{ id: 2, name: "Source channel ID", key: "hash_source_456" }] }) })
      .mockResolvedValueOnce({ json: async () => ({ success: true }) })

      // 5: Org Search (Existing)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { items: [{ item: { id: 200, name: "PosGenTS" } }] } }),
      })

      // 6: Person Search (Existing)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { items: [{ item: { id: 1001 } }] } }),
      })

      // 7: Deal Creation
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { id: 500 } }),
      });

    const inputData: Partial<ExtractedIssue> = {
      title: "Fix logic",
      repo: "vasian/PosGenTS",
      fullDescription: "AI text description"
    };

    const result = await createPipedriveDeal(inputData);

    // Assertions
    expect(result.data.id).toBe(500);

 // 1. Find the specific call for deal creation
    const dealCall = mockedFetch.mock.calls.find((c) => {
      const url = c[0] as string;
      // Cast the second argument to 'any' to access 'method'
      const options = c[1] as any; 
      return url.includes("/deals") && options?.method === "POST";
    });

    if (!dealCall) {
      throw new Error("Deal creation fetch call not found");
    }

    // 2. Cast to 'any' again to access 'body'
    const dealOptions = dealCall[1] as any;
    const dealBody = JSON.parse(dealOptions.body);

    expect(dealBody.hash_details_123).toBe("AI text description");
    expect(dealBody.hash_source_456).toBe("GitHub");
    expect(dealBody.org_id).toBe(200);
  });

  test("SCENARIO: Error Handling", async () => {
    mockedFetch
      .mockResolvedValueOnce({ json: async () => ({ success: false }) }) // Details fails
      .mockResolvedValueOnce({ json: async () => ({ success: false }) }) // Source fails
      .mockRejectedValueOnce(new Error("API Down")); // Org search throws

    await expect(createPipedriveDeal({ repo: "test" } as any)).rejects.toThrow("API Down");
  });
});