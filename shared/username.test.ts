import { describe, expect, it } from 'vitest';
import { normalizeUsername, usernameFormatError, usernameHandle } from './username';

describe('usernames', () => {
  it('accepts 3 to 20 letters, numbers, and underscores', () => {
    expect(usernameFormatError('Sam_Lifts')).toBeNull();
    expect(normalizeUsername(' @Sam_Lifts ')).toBe('sam_lifts');
    expect(usernameHandle('Sam_Lifts')).toBe('@sam_lifts');
  });

  it('rejects anything else', () => {
    expect(usernameFormatError('ab')).toMatch(/3 to 20/);
    expect(usernameFormatError('a'.repeat(21))).toMatch(/3 to 20/);
    expect(usernameFormatError('sam lifts')).toMatch(/3 to 20/);
    expect(usernameFormatError('sam-lifts')).toMatch(/3 to 20/);
    expect(usernameFormatError('')).toMatch(/Enter a username/);
    expect(usernameHandle('Sam Smith')).toBeNull();
    expect(usernameHandle('')).toBeNull();
  });
});
