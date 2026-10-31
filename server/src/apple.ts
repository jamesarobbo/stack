import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { safeEqual, sha256Hex } from './crypto';

const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status = 401,
  ) {
    super(message);
  }
}

/**
 * The iOS app sends the raw nonce here and the SHA-256 hex of that nonce to Apple.
 * Apple copies that hex into the identity token `nonce` claim.
 */
export async function verifyAppleIdentityToken(
  identityToken: string,
  rawNonce: string,
  options: { audience: string; jwks?: JWTVerifyGetKey },
): Promise<{ sub: string; email: string | null }> {
  const { payload } = await jwtVerify(identityToken, options.jwks ?? appleJwks, {
    issuer: 'https://appleid.apple.com',
    audience: options.audience,
  });
  const expected = await sha256Hex(rawNonce);
  if (typeof payload.nonce !== 'string' || !safeEqual(payload.nonce, expected)) {
    throw new AuthError('Apple nonce did not match.');
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new AuthError('Apple token is missing a subject.');
  }
  return { sub: payload.sub, email: typeof payload.email === 'string' ? payload.email : null };
}
