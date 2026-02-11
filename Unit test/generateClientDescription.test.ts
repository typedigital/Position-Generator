import { jest } from "@jest/globals";
import fs from "fs";

const mockGenerateContent = jest.fn() as jest.Mock<any>;
const mockGetGenerativeModel = jest.fn().mockReturnValue({
  generateContent: mockGenerateContent,
}) as jest.Mock<any>;

jest.unstable_mockModule("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

const { generateClientDescription } =
  await import("../src/services/aiService.js");

describe("FEATURE: Client-Friendly Description Generation", () => {
  const readFileSyncSpy = jest.spyOn(fs, "readFileSync");

  beforeEach(() => {
    jest.clearAllMocks();
    readFileSyncSpy.mockReturnValue("Professional summary: {{text}}");
  });

  afterAll(() => {
    readFileSyncSpy.mockRestore();
  });

  test("GIVEN a valid description, WHEN AI succeeds, THEN it should return professional text", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "This is a professional summary." },
    });

    const result = await generateClientDescription("messy tech notes");

    expect(result).toBe("This is a professional summary.");
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: "gemini-2.0-flash",
    });
  });

  test("GIVEN AI model fails, WHEN generated, THEN it should return cleaned original text", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API Error"));
    const originalText = "Original #Technical *Details*";

    const result = await generateClientDescription(originalText);

    expect(result).toBe("Original Technical Details");
  });

  test("GIVEN prompt.txt is missing, WHEN generated, THEN it should use fallback template", async () => {
    readFileSyncSpy.mockImplementation(() => {
      throw new Error("FS Error");
    });
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "Summary from fallback" },
    });

    const result = await generateClientDescription("input");

    expect(result).toBe("Summary from fallback");
  });

  test("GIVEN an empty input, WHEN generated, THEN it should return a placeholder message", async () => {
    const result = await generateClientDescription("");
    expect(result).toBe("No issue description was provided.");
  });
});
