import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import type { ExtractedIssue } from "../src/utils/githubData.js";

jest.unstable_mockModule("../src/config/config.js", () => ({
  default: {
    CUSTOMER_EMAIL: "benjamin.leon@gmail.com",
    PIPEDRIVE_API_KEY: "mock-api-key",
  },
}));

global.fetch = jest.fn() as any;
const mockedFetch = global.fetch as jest.Mock<any>;

const { createPipedriveDeal } =
  await import("../src/services/pipedriveService.js");

describe("FEATURE: Pipedrive Deal Creation", () => {
  beforeEach(() => {
    mockedFetch.mockClear();
  });

  test("SCENARIO: Successful Creation Waterfall", async () => {
    // GIVEN
    mockedFetch
    
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [{ key: "label", options: [{ id: 77, label: "Customer" }] }],
        }),
      })
      
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            items: [
              {
                item: {
                  id: 1001,
                  organization: { id: 200 },
                  name: "Benjamin Leon",
                },
              },
            ],
          },
        }),
      })
   
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { id: 1001 } }),
      })
     
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { id: 500 } }),
      })
      
      .mockResolvedValueOnce({
        json: async () => ({ success: true }),
      });

    const inputData: ExtractedIssue = {
      title: "Fix Logic Error",
      repo: "test/repo",
    } as any;

    // WHEN: The deal creation service is executed
    const result = await createPipedriveDeal(inputData);

    // THEN: The service should return the ID of the created deal (500)
    expect(result.data.id).toBe(500);
    
    // AND
    const putCall = mockedFetch.mock.calls.find(c => (c[1] as any)?.method === "PUT");
    const putBody = JSON.parse((putCall![1] as any).body);
    expect(putBody.label).toBe(77);
  });

  test("SCENARIO: Network Failure", async () => {
    // GIVEN
    mockedFetch.mockRejectedValueOnce(new Error("API Down"));

    // WHEN / THEN
    await expect(createPipedriveDeal({} as any)).rejects.toThrow("API Down");
  });
});