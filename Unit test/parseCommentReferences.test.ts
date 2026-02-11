import { jest } from "@jest/globals";
import { parseCommentReferences } from "../src/utils/githubData.js";

describe("FEATURE: Point (PT) Reference Parsing", () => {
  test('GIVEN a comment without the keyword "pt", WHEN parsed, THEN it should return an empty array with a negative status', () => {
    // GIVEN
    const items = [
      { json: { body: "This is a regular comment without the keyword" } },
    ];

    // WHEN
    const result = parseCommentReferences(items as any);

    // THEN
    expect(result.foundEntries).toEqual([]);

    expect(result.message).toBe("No valid entries found");

    expect(result.status).toBe(false);
  });

  test('GIVEN a comment with a standard "Dept pt #" format, WHEN parsed, THEN it should extract the department and number correctly', () => {
    // GIVEN
    const items = [{ json: { body: "Sales pt 5" } }];

    // WHEN
    const result = parseCommentReferences(items as any);

    // THEN
    expect(result.foundEntries).toEqual([
      { dept: "Sales", num: "5", comment: "Sales pt 5" },
    ]);
    expect(result.message).toBe("Entries successfully parsed");
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment with a trailing "Dept #pt" format, WHEN parsed, THEN it should correctly identify the number and department', () => {
    // GIVEN
    const items = [{ json: { body: "Marketing 3pt" } }];

    // WHEN
    const result = parseCommentReferences(items as any);

    // THEN
    expect(result.foundEntries).toEqual([
      { dept: "Marketing", num: "3", comment: "Marketing 3pt" },
    ]);
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment with "pt #" but no department, WHEN parsed, THEN it should return a null department and the correct number', () => {
    // GIVEN
    const items = [{ json: { body: "pt 7" } }];

    // WHEN
    const result = parseCommentReferences(items as any);

    // THEN
    expect(result.foundEntries).toEqual([
      { dept: null, num: "7", comment: "pt 7" },
    ]);
    expect(result.status).toBe(true);
  });

  test("GIVEN a comment containing multiple references, WHEN parsed, THEN it should extract every valid entry found", () => {
    // GIVEN
    const items = [{ json: { body: "Sales pt 3, Marketing pt 7, HR pt 2" } }];

    // WHEN
    const result = parseCommentReferences(items as any);

    // THEN
    expect(result.foundEntries).toHaveLength(3);
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment using a colon separator "pt: #", WHEN parsed, THEN it should extract the number accurately', () => {
    // GIVEN
    const items = [{ json: { body: "Sales pt: 5" } }];

    // WHEN
    const result = parseCommentReferences(items as any);

    // THEN
    expect(result.foundEntries[0].num).toBe("5");
    expect(result.status).toBe(true);
  });

  test("GIVEN a nested GitHub JSON structure, WHEN parsed, THEN it should navigate the object path to find the body", () => {
    // GIVEN
    const items = [{ json: { body: { comment: { body: "Sales pt 10" } } } }];

    // WHEN
    const result = parseCommentReferences(items as any);

    // THEN
    expect(result.foundEntries[0].dept).toBe("Sales");
    expect(result.status).toBe(true);
  });

  test('GIVEN a comment that contains "pt" but no accompanying digits, WHEN parsed, THEN it should return no valid entries', () => {
    // GIVEN
    const items = [{ json: { body: "This is about pt but no number" } }];

    // WHEN
    const result = parseCommentReferences(items as any);

    // THEN
    expect(result.foundEntries).toEqual([]);
    expect(result.message).toBe("No valid entries found");
    expect(result.status).toBe(false);
  });
});
