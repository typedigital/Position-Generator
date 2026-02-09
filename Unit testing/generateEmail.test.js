const { generateEmailHtml } = require('../src/services/emailService');

describe('FEATURE: HTML Email Generation', () => {

  describe('SCENARIO: Full data availability', () => {
    test('GIVEN a complete issue dataset WHEN generateEmailHtml is called THEN it should return a string containing all metadata and point entries', () => {
      const data = {
        number: 42,
        title: 'Fix login bug',
        fullDescription: 'Users cannot log in with special characters in password',
        status: 'open',
        author: 'john-doe',
        repo: 'company/project',
        url: 'https://github.com/company/project/issues/42',
        created: '2026-02-05T13:07:15Z',
        parsedEntries: [{ dept: 'Backend', num: '5', comment: 'Backend pt 5' }]
      };

      const html = generateEmailHtml(data);

      expect(typeof html).toBe('string');
      expect(html).toContain('#42');
      expect(html).toContain('Fix login bug');
      expect(html).toContain('Backend 5');
    });
  });

  describe('SCENARIO: Formatting department points', () => {
    test('GIVEN multiple department entries WHEN processed THEN it should concatenate them into a single string (e.g. "Design 6 Dev 2")', () => {
      const data = {
        parsedEntries: [
          { dept: 'Design', num: '6', comment: '...' },
          { dept: 'Dev', num: '2', comment: '...' }
        ]
        // ... other required fields
      };

      const html = generateEmailHtml(data);
      expect(html).toContain('Design 6 Dev 2');
    });

    test('GIVEN an entry with a null department WHEN processed THEN it should only display the numeric value without "null"', () => {
      const data = {
        parsedEntries: [{ dept: null, num: '8', comment: 'pt 8' }]
        // ... other required fields
      };

      const html = generateEmailHtml(data);
      expect(html).toContain('8');
      expect(html).not.toContain('null');
    });
  });

  describe('SCENARIO: Handling missing or empty point entries', () => {
    test('GIVEN an empty parsedEntries array WHEN the email is generated THEN the PT section should display "N/A"', () => {
      const data = { parsedEntries: [] /* ... */ };
      const html = generateEmailHtml(data);
      expect(html).toContain('N/A');
    });

    test('GIVEN an undefined parsedEntries field WHEN the email is generated THEN it should gracefully default to "N/A"', () => {
      const data = { /* parsedEntries missing */ };
      const html = generateEmailHtml(data);
      expect(html).toContain('N/A');
    });
  });

  describe('SCENARIO: Structural and Security requirements', () => {
    test('GIVEN any valid issue WHEN generateEmailHtml is called THEN it should return a valid HTML5 document structure', () => {
      const data = { /* ... */ };
      const html = generateEmailHtml(data);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</body>');
    });

    test('GIVEN a URL WHEN generateEmailHtml is called THEN it should output a clickable anchor tag with "View on GitHub"', () => {
      const url = 'https://github.com/test/repo/issues/100';
      const data = { url /* ... */ };
      
      const html = generateEmailHtml(data);
      expect(html).toContain(`<a href="${url}"`);
      expect(html).toContain('View on GitHub');
    });
  });
});