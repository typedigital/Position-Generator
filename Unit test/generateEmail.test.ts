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


const { createPipedriveDeal } =
  await import("../src/services/pipedriveService.js");

describe("FEATURE: Pipedrive Deal Creation & Integration", () => {
  beforeEach(() => {
    mockedFetch.mockClear();
  });

  describe("SCENARIO: Successful Creation Waterfall", () => {
    test("GIVEN existing Pipedrive records, WHEN createPipedriveDeal is called, THEN it should link and create the deal", async () => {
      // GIVEN
      mockedFetch
        .mockResolvedValueOnce({
          
          json: async () => ({
            success: true,
            data: {
              items: [{ item: { id: 1001, organization: { id: 200 } } }],
            },
          }),
        })
        .mockResolvedValueOnce({
          
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
       
          json: async () => ({
            success: true,
            data: { id: 500 },
          }),
        })
        .mockResolvedValueOnce({
          
          json: async () => ({ success: true }),
        });

      const inputData: ExtractedIssue = {
        title: "Fix logic",
        number: 42,
        fullDescription: "AI text description",
        author: "vasian",
        repo: "vasian/PosGenTS",
      } as any;

      // WHEN
      const result = await createPipedriveDeal(inputData);

      // THEN
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(500); 

      // Verify the correct flow
      const calls = mockedFetch.mock.calls;
      expect(calls[0][0]).toContain("/persons/search");

      const dealCall = calls.find((c) => (c[0] as string).includes("/deals"));
      const dealBody = JSON.parse((dealCall![1] as any).body);
      expect(dealBody.person_id).toBe(1001);
      expect(dealBody.org_id).toBe(200);
    });
  });

  describe("SCENARIO: Error Handling", () => {
    test("GIVEN a network failure, WHEN createPipedriveDeal is called, THEN it should throw an error", async () => {
      // GIVEN
      mockedFetch.mockRejectedValueOnce(new Error("API Down"));

      // WHEN / THEN
      await expect(createPipedriveDeal({} as any)).rejects.toThrow("API Down");
    });
  });
});
