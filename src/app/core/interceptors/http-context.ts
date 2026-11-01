import { HttpContext, HttpContextToken } from '@angular/common/http';

/** La requête part sans jeton (connexion, marque) et un 401 n'y ferme pas la session. */
export const WITHOUT_TOKEN = new HttpContextToken<boolean>(() => false);

/** Jeton à utiliser à la place de celui de la session (lecture du compte juste après la connexion). */
export const TOKEN_OVERRIDE = new HttpContextToken<string | null>(() => null);

/** L'écran affiche lui-même l'erreur : pas de toast global. */
export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

/** Options d'un appel de `BaseService`, lues par les intercepteurs. */
export interface RequestOptions {
  withoutToken?: boolean;
  silentErrors?: boolean;
  token?: string;
}

export function contextOf(options: RequestOptions = {}): HttpContext {
  return new HttpContext()
    .set(WITHOUT_TOKEN, options.withoutToken ?? false)
    .set(SILENT_ERRORS, options.silentErrors ?? false)
    .set(TOKEN_OVERRIDE, options.token ?? null);
}
