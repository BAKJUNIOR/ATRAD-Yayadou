export function jwtExpiresAt(token: string): number | null {
  try {
    const payload = token.split('.')[1] ?? '';
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, now: number): boolean {
  const expiresAt = jwtExpiresAt(token);
  return expiresAt === null || expiresAt <= now;
}
