// 1. Correct the import to the official package
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 2. Create deep mock functions to match the SDK structure:
// genAI.getGenerativeModel() -> { generateContent() }
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn().mockReturnValue({
  generateContent: mockGenerateContent
});

// 3. Mock the OFFICIAL module
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel
    }))
  };
});

// 4.require your code 
const { generateClientDescription } = require('../src/services/aiService');

describe('FEATURE: Client-Friendly Description Generation', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SCENARIO: Successful AI Rewriting', () => {
    test('GIVEN a valid description ,WHEN the primary model succeeds ,THEN it should return the AI-generated professional text', async () => {
      // GIVEN: The SDK returns a response object with a .text() method
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Professional AI Description' }
      });
      
      const issueData = { fullDescription: 'messy technical details' };
      
      // WHEN
      const result = await generateClientDescription(issueData.fullDescription);

      // THEN
      expect(result).toBe('Professional AI Description');
      expect(mockGetGenerativeModel).toHaveBeenCalled();
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('SCENARIO: Model Failure and Fallback', () => {
    test('GIVEN the primary model fails, WHEN a fallback model is available ,THEN it should attempt the second model', async () => {
      // GIVEN: Fail first call, succeed second call
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Primary Down'))
        .mockResolvedValueOnce({
          response: { text: () => 'Fallback AI Description' }
        });

      const issueData = { fullDescription: 'Original technical notes' };
      
      // WHEN
      const result = await generateClientDescription(issueData.fullDescription);

      // THEN
      expect(result).toBe('Fallback AI Description');
      // Should try the next model in the list
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    test('GIVEN all AI models fail ,WHEN generated ,THEN it should return the original text', async () => {
      // GIVEN: All attempts fail
      mockGenerateContent.mockRejectedValue(new Error('API Failure'));

      const originalText = 'Keep this original text';
      const issueData = { fullDescription: originalText };
      
      // WHEN
      const result = await generateClientDescription(issueData.fullDescription);

      // THEN
      expect(result).toBe(originalText);
    });
  });

  describe('SCENARIO: Input Validation', () => {
    test('GIVEN an empty description ,WHEN generated ,THEN it should return placeholder', async () => {
      const issueData = { fullDescription: '' };
      const result = await generateClientDescription(issueData.fullDescription);
      
      // Matches the specific string required by your requirement
      expect(result).toBe('No issue description was provided.');
    });
  });
});