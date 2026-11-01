import { isJwtExpired, jwtExpiresAt } from './jwt.util';

/** Jeton non signé, suffisant pour lire `exp`. */
function jwt(payload: object): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;
}

describe('jwt.util', () => {
  it('should read the expiry date in milliseconds', () => {
    expect(jwtExpiresAt(jwt({ exp: 1_800_000_000 }))).toBe(1_800_000_000_000);
  });

  it('should consider an expired, unreadable or exp-less token as expired', () => {
    const now = 1_800_000_000_000;
    expect(isJwtExpired(jwt({ exp: 1_800_000_060 }), now)).toBe(false);
    expect(isJwtExpired(jwt({ exp: 1_799_999_000 }), now)).toBe(true);
    expect(isJwtExpired(jwt({ sub: 'u-1' }), now)).toBe(true);
    expect(isJwtExpired('pas-un-jeton', now)).toBe(true);
  });
});
