/** Date d'expiration d'un JWT (champ `exp`, en secondes), sans en vérifier la signature : le serveur s'en charge. */
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

/** Jeton illisible ou expiré à l'instant `now` (millisecondes). */
export function isJwtExpired(token: string, now: number): boolean {
  const expiresAt = jwtExpiresAt(token);
  return expiresAt === null || expiresAt <= now;
}
