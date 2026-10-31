const USERNAME = /^[a-z0-9_]{3,20}$/;

/** Lowercase handle without a leading @. Empty when the field is blank. */
export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

/** Null when the value can be stored. Otherwise a sentence the person can act on. */
export function usernameFormatError(value: string): string | null {
  const name = normalizeUsername(value);
  if (!name) return 'Enter a username.';
  if (!USERNAME.test(name)) return 'Use 3 to 20 letters, numbers, or underscores.';
  return null;
}

/** Public form, such as @sam_lifts. Null when there is no username yet. */
export function usernameHandle(value: string | null | undefined): string | null {
  if (!value) return null;
  const name = normalizeUsername(value);
  if (!USERNAME.test(name)) return null;
  return `@${name}`;
}
