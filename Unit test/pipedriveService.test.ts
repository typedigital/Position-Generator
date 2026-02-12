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

describe("FEATURE: Pipedrive Deal Creation", () => {
  beforeEach(() => {
    mockedFetch.mockClear();
  });

  test("SCENARIO: Successfully create deal with proper organization and person links", async () => {
    // GIVEN

    mockedFetch
      .mockResolvedValueOnce({ // 1. Org Search
        json: async () => ({ success: true, data: { items: [{ item: { id: 200, name: "PosGenTS" } }] } }) 
      })
      .mockResolvedValueOnce({ // 2. Person Search
        json: async () => ({ success: true, data: { items: [{ item: { id: 1001 } }] } }) 
      })
      .mockResolvedValueOnce({ // 3. Person Update (PUT)
        json: async () => ({ success: true }) 
      })
      .mockResolvedValueOnce({ // 4. Manager Search
        json: async () => ({ success: true, data: [{ id: 8877 }] }) 
      })
      .mockResolvedValueOnce({ // 5. Deal Create
        json: async () => ({ success: true, data: { id: 500 } }) 
      })
      .mockResolvedValueOnce({ // 6. Note Create
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

    // --- WHEN ---
   
    const result = await createPipedriveDeal(inputData);

    // --- THEN ---
   
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(500);

    const orgSearchCall = mockedFetch.mock.calls[0];
    expect(orgSearchCall[0]).toContain("term=PosGenTS");

   
    const personUpdateCall = mockedFetch.mock.calls.find(
      (call: any) => call[1]?.method === "PUT"
    );
    expect(personUpdateCall).toBeDefined();
    const updateBody = JSON.parse((personUpdateCall![1] as any).body);
    expect(updateBody.org_id).toBe(200);

    
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