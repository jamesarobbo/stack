/**
 * Sign-in code delivery rules.
 *
 * The API never puts a sign-in code in a response, except on a local `wrangler dev` (ENVIRONMENT=development
 * and a localhost request), so a deployed Worker cannot hand out codes even if its vars are wrong.
 *
 * Test accounts for preview builds: TEST_EMAILS lists addresses that may sign in with the TEST_SIGN_IN_CODE secret.
 * Only reserved test domains are accepted (RFC 2606 and RFC 6761), so no real person's mailbox can be on the list.
 */

const RESERVED_DOMAINS = ['example.com', 'example.org', 'example.net'];
const RESERVED_SUFFIXES = ['.test', '.example', '.invalid'];

export function isReservedTestAddress(email: string): boolean {
  const domain = email.split('@')[1] ?? '';
  if (!domain) return false;
  if (RESERVED_DOMAINS.includes(domain)) return true;
  return RESERVED_SUFFIXES.some((suffix) => domain.endsWith(suffix));
}

export function testEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.includes('@') && isReservedTestAddress(item));
}

export function testCode(raw: string | undefined): string | null {
  const code = (raw ?? '').trim();
  return /^\d{6}$/.test(code) ? code : null;
}

export function isTestSignIn(env: { TEST_EMAILS?: string; TEST_SIGN_IN_CODE?: string }, email: string): boolean {
  return testCode(env.TEST_SIGN_IN_CODE) != null && testEmails(env.TEST_EMAILS).includes(email);
}

export function returnsDevCode(environment: string | undefined, requestUrl: string): boolean {
  if (environment !== 'development') return false;
  const host = new URL(requestUrl).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}
