/** Profils métier de l'application : chacun a son propre parcours et son propre menu. */
export const ROLES = ['agence', 'accueil', 'traitement', 'manager', 'admin'] as const;

export type Role = (typeof ROLES)[number];

export interface Account {
  role: Role;
  /** Identifiant de connexion (ex. `a.diallo`). */
  ident: string;
  name: string;
  roleLabel: string;
  /** Agence ou entité de rattachement. */
  entity: string;
}

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}
