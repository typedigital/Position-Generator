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
      // GIVEN: Sequential mocks matching service logic
      mockedFetch
        .mockResolvedValueOnce({
          // 1. Person Search
          json: async () => ({
            success: true,
            data: {
              items: [{ item: { id: 1001, organization: { id: 200 } } }],
            },
          }),
        })
        .mockResolvedValueOnce({
          // 2. Person Update (PUT)
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          // 3. Deal Create
          json: async () => ({ success: true, data: { id: 500 } }),
        })
        .mockResolvedValueOnce({
          // 4. Note Create
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

      // FIX for TS2571: Cast the call to 'any' to access the body
      const dealCall = mockedFetch.mock.calls.find((c) =>
        (c[0] as string).includes("/deals"),
      );

      if (dealCall) {
        const options = dealCall[1] as any; // Cast to any to access .body
        const dealBody = JSON.parse(options.body);
        expect(dealBody.person_id).toBe(1001);
        expect(dealBody.org_id).toBe(200);
      } else {
        throw new Error("Deal creation API call not found");
      }
    });
  });

  describe("SCENARIO: Error Handling", () => {
    test("GIVEN a network failure, WHEN createPipedriveDeal is called, THEN it should throw an error", async () => {
      mockedFetch.mockRejectedValueOnce(new Error("API Down"));
      await expect(createPipedriveDeal({} as any)).rejects.toThrow("API Down");
    });
  });
});
