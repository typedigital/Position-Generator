import { jest, describe, test, expect, beforeEach } from "@jest/globals";

jest.unstable_mockModule("../src/config/config.js", () => ({
  default: {
    CUSTOMER_EMAIL: "client@example.com",
    EMAIL_USER: "manager@example.com",
    PIPEDRIVE_API_KEY: "mock-api-key",
  },
}));

jest.unstable_mockModule("../src/services/aiService.js", () => ({
  generateClientDescription: jest
    .fn<() => Promise<string>>()
    .mockResolvedValue("Mocked AI description"),
}));

global.fetch = jest.fn() as any;
const mockedFetch = global.fetch as jest.Mock<any>;

// Import the service AFTER mocks are set up
const { createPipedriveDeal } =
  await import("../src/services/pipedriveService.js");

describe("FEATURE: Pipedrive Deal Creation with Dynamic Manager Name", () => {
  beforeEach(() => {
    mockedFetch.mockClear();
  });

  test("SCENARIO: Successfully create a person using the manager's name and link it to a new deal", async () => {
    mockedFetch

      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: [{ id: 8877, name: "Vasian Manager" }],
        }),
      })

      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: { items: [] },
        }),
      })

      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 1001 },
        }),
      })

      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 500 },
        }),
      })

      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const inputData = {
      title: "New",
      fullDescription: "AI generated text",
    };

    // WHEN
    const result = await createPipedriveDeal(inputData);

    // THEN
    expect(result.data.id).toBe(500);

    // AND
    const personCreateCall = mockedFetch.mock.calls.find(
      (call: any) => call[1]?.method === "POST" && call[0].includes("/persons"),
    ) as [string, RequestInit] | undefined;

    expect(personCreateCall).toBeDefined();
    if (personCreateCall && personCreateCall[1]?.body) {
      const personBody = JSON.parse(personCreateCall[1].body as string);

      expect(personBody.name).toBe("Vasian Manager");
      expect(personBody.email).toContain("client@example.com");
    }

    // AND
    const dealCreateCall = mockedFetch.mock.calls.find(
      (call: any) => call[1]?.method === "POST" && call[0].includes("/deals"),
    ) as [string, RequestInit] | undefined;

    expect(dealCreateCall).toBeDefined();
    if (dealCreateCall && dealCreateCall[1]?.body) {
      const dealBody = JSON.parse(dealCreateCall[1].body as string);
      expect(dealBody.person_id).toBe(1001);
      expect(dealBody.user_id).toBe(8877);
      expect(dealBody.title).toBe("New");
    }

    // AND
    const noteCreateCall = mockedFetch.mock.calls.find(
      (call: any) => call[1]?.method === "POST" && call[0].includes("/notes"),
    ) as [string, RequestInit] | undefined;

    if (noteCreateCall && noteCreateCall[1]?.body) {
      const noteBody = JSON.parse(noteCreateCall[1].body as string);
      expect(noteBody.content).toBe("AI generated text");
    }
  });
});
