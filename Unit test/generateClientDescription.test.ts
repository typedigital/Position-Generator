import { jest } from '@jest/globals';
import fs from 'fs';

// 1. Setup AI Mocks
const mockGenerateContent = jest.fn() as any;
const mockGetGenerativeModel = jest.fn().mockReturnValue({
  generateContent: mockGenerateContent,
}) as any;

jest.unstable_mockModule("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
  };
});

// 2. Import the service dynamically
const { generateClientDescription } = await import("../src/services/aiService.js");

describe("FEATURE: Client-Friendly Description Generation", () => {
  // Use spyOn for fs.readFileSync
  const readFileSyncSpy = jest.spyOn(fs, 'readFileSync');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // GIVEN: Default behavior for the file system mock
    readFileSyncSpy.mockReturnValue("Instructions: {{text}}");
  });

  afterAll(() => {
    readFileSyncSpy.mockRestore();
  });

  describe("SCENARIO: Successful AI Rewriting", () => {
    test("GIVEN a valid description, WHEN the primary model succeeds, THEN it should return the AI-generated professional text", async () => {
      // GIVEN
      const issueDescription = "messy technical details";
      mockGenerateContent.mockResolvedValue({
        response: { text: () => "Dies ist eine professionelle Zusammenfassung." },
      });

      // WHEN
      const result = await generateClientDescription(issueDescription);

      // THEN
      expect(result).toBe("Dies ist eine professionelle Zusammenfassung.");
      expect(readFileSyncSpy).toHaveBeenCalled();
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: "gemini-1.5-flash" });
    });
  });

  describe("SCENARIO: Model Failure and Fallback", () => {
    test("GIVEN the primary model fails, WHEN a fallback model is available, THEN it should attempt the second model", async () => {
      // GIVEN: Primary fails, Fallback succeeds
      mockGenerateContent
        .mockRejectedValueOnce(new Error("Primary Model Down"))
        .mockResolvedValueOnce({
          response: { text: () => "Fallback Professional Text" },
        });

      const issueDescription = "Original technical notes";

      // WHEN
      const result = await generateClientDescription(issueDescription);

      // THEN
      expect(result).toBe("Fallback Professional Text");
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    test("GIVEN all AI models fail, WHEN generated, THEN it should return the cleaned original text", async () => {
      // GIVEN
      mockGenerateContent.mockRejectedValue(new Error("API Quota Exceeded"));
      const originalText = "Original #Technical *Details*";

      // WHEN
      const result = await generateClientDescription(originalText);

      // THEN
      expect(result).toBe("Original Technical Details");
    });
  });

  describe("SCENARIO: Input Validation & Cleaning", () => {
    test("GIVEN an empty description, WHEN generated, THEN it should return placeholder", async () => {
      // GIVEN
      const emptyInput = "";

      // WHEN
      const result = await generateClientDescription(emptyInput);

      // THEN
      expect(result).toBe("No issue description was provided.");
    });

    test("GIVEN a response with forbidden special characters, WHEN processed, THEN it should return a cleaned version", async () => {
      // GIVEN
      mockGenerateContent.mockResolvedValue({
        response: { text: () => "Kernpunkte: * Punkt 1 # Punkt 2" },
      });

      // WHEN
      const result = await generateClientDescription("input");

      // THEN
      expect(result).toBe("Kernpunkte: Punkt 1 Punkt 2");
    });
  });

  describe("SCENARIO: Prompt File Loading", () => {
    test("GIVEN prompt.txt is missing, WHEN generated, THEN it should use the fallback template", async () => {
      // GIVEN: fs.readFileSync throws an error
      readFileSyncSpy.mockImplementation(() => {
        throw new Error("File not found");
      });
      
      mockGenerateContent.mockResolvedValue({
        response: { text: () => "Fallback Template Result" },
      });

      // WHEN
      const result = await generateClientDescription("some text");

      // THEN
      expect(result).toBe("Fallback Template Result");
    });
  });
});