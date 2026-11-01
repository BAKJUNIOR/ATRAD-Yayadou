/** Réponse de la connexion (`auth.login`) : jeton d'accès et sa durée de validité, en secondes. */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
