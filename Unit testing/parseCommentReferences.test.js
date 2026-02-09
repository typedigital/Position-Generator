const { parseCommentReferences } = require('../catchGHInfo');

describe('FEATURE: Point (PT) Reference Parsing', () => {
  
  test('GIVEN a comment without the keyword "pt" WHEN parsed THEN it should return an empty array with a negative status', () => {
    const items = [{ json: { body: 'This is a regular comment without the keyword' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries).toEqual([]);
    expect(result.message).toBe('No "pt" found in comment');
    expect(result.status).toBe(false);
  });

  test('GIVEN a comment with a standard "Dept pt #" format WHEN parsed THEN it should extract the department and number correctly', () => {
    const items = [{ json: { body: 'Sales pt 5' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries).toEqual([{
      dept: 'Sales',
      num: '5',
      comment: 'Sales pt 5'
    }]);
    expect(result.message).toBe('Entries successfully parsed');
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment with a trailing "Dept #pt" format WHEN parsed THEN it should correctly identify the number and department', () => {
    const items = [{ json: { body: 'Marketing 3pt' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries).toEqual([{
      dept: 'Marketing',
      num: '3',
      comment: 'Marketing 3pt'
    }]);
    expect(result.message).toBe('Entries successfully parsed');
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment with "pt #" but no department WHEN parsed THEN it should return a null department and the correct number', () => {
    const items = [{ json: { body: 'pt 7' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries).toEqual([{
      dept: null,
      num: '7',
      comment: 'pt 7'
    }]);
    expect(result.message).toBe('Entries successfully parsed');
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment with "#pt" but no department WHEN parsed THEN it should return a null department and the correct number', () => {
    const items = [{ json: { body: '5pt' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries).toEqual([{
      dept: null,
      num: '5',
      comment: '5pt'
    }]);
    expect(result.message).toBe('Entries successfully parsed');
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment containing multiple references WHEN parsed THEN it should extract every valid entry found', () => {
    const items = [{ json: { body: 'Sales pt 3, Marketing pt 7, HR pt 2' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries).toHaveLength(3);
    expect(result.message).toBe('Entries successfully parsed');
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment with uppercase "PT" WHEN parsed THEN it should handle the case-insensitivity correctly', () => {
    const items = [{ json: { body: 'Development PT 10' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries[0].num).toBe('10');
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment with mixed-case "Pt" WHEN parsed THEN it should identify the entry successfully', () => {
    const items = [{ json: { body: 'Finance Pt 15' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries[0].dept).toBe('Finance');
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment using a colon separator "pt: #" WHEN parsed THEN it should extract the number accurately', () => {
    const items = [{ json: { body: 'Sales pt: 5' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries[0].num).toBe('5');
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment using a dash separator "pt-#" WHEN parsed THEN it should extract the number accurately', () => {
    const items = [{ json: { body: 'Marketing pt-8' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries[0].num).toBe('8');
    expect(result.status).toBe(true);
  });

  test('GIVEN a nested GitHub JSON structure WHEN parsed THEN it should navigate the object path to find the comment body', () => {
    const items = [{ json: { body: { comment: { body: 'Sales pt 10' } } } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries[0].dept).toBe('Sales');
    expect(result.status).toBe(true);
  });

  test('GIVEN a department name containing special characters like "&" WHEN parsed THEN it should include those characters in the department name', () => {
    const items = [{ json: { body: 'R&D pt 20' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries[0].dept).toBe('R&D');
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment with a mix of different pt formats WHEN parsed THEN it should successfully identify and extract all of them', () => {
    const items = [{ json: { body: 'Sales pt 3 and 5pt for Marketing, also pt 7' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries).toHaveLength(3);
  });

  test('GIVEN an empty comment body WHEN parsed THEN it should return a negative status with a specific error message', () => {
    const items = [{ json: { body: '' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries).toEqual([]);
    expect(result.message).toBe('No "pt" found in comment');
    expect(result.status).toBe(false);
  });

  test('GIVEN a comment that contains "pt" but no accompanying digits WHEN parsed THEN it should fail regex validation and return no valid entries', () => {
    const items = [{ json: { body: 'This is about pt but no number' } }];
    const result = parseCommentReferences(items);
    
    expect(result.foundEntries).toEqual([]);
    expect(result.message).toBe('No valid entries found');
    expect(result.status).toBe(false);
  });
});