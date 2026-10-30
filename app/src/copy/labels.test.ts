import { describe, expect, it } from 'vitest';
import {
  ADD_BUTTON_LABEL,
  ADD_SUPPLEMENT_LABEL,
  ADD_SUPPLEMENT_ROUTE,
  CLEAR_ALL_DATA_LABEL,
  LOAD_EXAMPLE_LABEL,
  MONTHLY_REPORT_LABEL,
  stackHeading,
} from './labels';

describe('stack labels', () => {
  it('names an empty stack without a seeded first name', () => {
    expect(stackHeading('')).toBe('Your stack');
    expect(stackHeading('   ')).toBe('Your stack');
    expect(stackHeading('Alex')).toBe("Alex's stack");
    expect(stackHeading('Robin')).toBe("Robin's stack");
    expect(stackHeading('James')).toBe("James' stack");
  });

  it('keeps add and developer actions in sentence case', () => {
    expect(ADD_BUTTON_LABEL).toBe('Add');
    expect(ADD_SUPPLEMENT_LABEL).toBe('Add supplement');
    expect(ADD_SUPPLEMENT_ROUTE).toBe('/add');
    expect(LOAD_EXAMPLE_LABEL).toBe('Load example data');
    expect(CLEAR_ALL_DATA_LABEL).toBe('Clear all data');
    expect(MONTHLY_REPORT_LABEL).toBe('Monthly report');
    for (const label of [ADD_BUTTON_LABEL, ADD_SUPPLEMENT_LABEL, LOAD_EXAMPLE_LABEL, CLEAR_ALL_DATA_LABEL, MONTHLY_REPORT_LABEL]) {
      expect(label).not.toMatch(/^[A-Z0-9 \-]+$/);
    }
  });
});
