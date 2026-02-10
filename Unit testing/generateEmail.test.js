const { generateEmailHtml } = require('../src/services/emailService');
const fs = require('fs');

// 1. MOCK THE FILE SYSTEM
jest.mock('fs');

describe('FEATURE: HTML Email Generation & Formatting', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    // GIVEN: The filesystem always returns a valid template structure
    fs.readFileSync.mockReturnValue(`
      <!DOCTYPE html>
      <html>
        <body>
          <h1>#{{issueNumber}} {{title}}</h1>
          <p>{{description}}</p>
          <span>{{ptValue}}</span>
          <p>{{date}}</p>
          <a href="{{url}}">View on GitHub</a>
        </body>
      </html>
    `);
    fs.existsSync.mockReturnValue(true);
  });

  describe('SCENARIO: Successful Generation with Complete Data', () => {
    test('GIVEN a complete issue dataset ,WHEN generateEmailHtml is called ,THEN it should return a German-localized HTML document', () => {
      const data = {
        number: 42,
        title: 'Fix login bug',
        fullDescription: 'Users cannot log in',
        status: 'open',
        author: 'john-doe',
        repo: 'company/project',
        url: 'https://github.com/company/project/issues/42',
        created: '2026-02-05T13:07:15Z',
        parsedEntries: [{ dept: 'Backend', num: '5' }]
      };

      const html = generateEmailHtml(data);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('#42');
      expect(html).toContain('Fix login bug');
      expect(html).toContain('Backend 5');
      expect(html).toContain('05.02.2026'); // German format
    });
  });

  describe('SCENARIO: Error Handling', () => {
    test('GIVEN a null dataset ,WHEN generated ,THEN it should return a fallback error string instead of crashing', () => {
      // This previously caused the TypeError
      const html = generateEmailHtml(null);
      expect(html).toContain('Fehler');
    });
  });
});