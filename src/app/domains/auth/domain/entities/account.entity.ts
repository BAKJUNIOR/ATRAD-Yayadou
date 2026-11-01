import { Utilisateur } from './utilisateur.entity';

/** Profils métier de l'application : chacun a son propre parcours et son propre menu. */
export const ROLES = ['agence', 'accueil', 'traitement', 'manager', 'admin'] as const;

export type Role = (typeof ROLES)[number];

export interface Account {
  /** Identifiant (UUID) de l'utilisateur dans l'API. */
  id: string;
  /** Profil affiché : le premier des profils de l'utilisateur, dans l'ordre de `ROLES`. */
  role: Role;
  /** Tous les profils de l'utilisateur. */
  roles: Role[];
  /** Identifiant de connexion (matricule, ex. `a.diallo`). */
  ident: string;
  name: string;
  roleLabel: string;
  /** Entité de rattachement, au format `Nom (CODE)` ; vide si l'utilisateur n'est rattaché à aucune. */
  entity: string;
  entityId: string | null;
}

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

const ROLE_OF_PROFIL: Record<string, Role> = {
  AGENCE: 'agence',
  ACCUEIL: 'accueil',
  TRAITEMENT: 'traitement',
  MANAGER: 'manager',
  ADMIN: 'admin',
};

/**
 * Compte de session à partir de l'utilisateur renvoyé par l'API ; `null` s'il n'a aucun profil connu du front.
 * Le profil affiché est le premier de ses profils dans l'ordre de `ROLES`.
 */
export function accountFromUtilisateur(utilisateur: Utilisateur): Account | null {
  const roles = ROLES.filter((role) =>
    utilisateur.profils.some((profil) => ROLE_OF_PROFIL[profil.toUpperCase()] === role),
  );
  const role = roles[0];
  if (!role) {
    return null;
  }
  const entite = utilisateur.entite;
  return {
    id: utilisateur.id,
    role,
    roles,
    ident: utilisateur.matricule,
    name: `${utilisateur.prenom} ${utilisateur.nom}`.trim(),
    roleLabel: roleLabel(role, entite?.nom),
    entity: entite ? `${entite.nom} (${entite.code})` : role === 'admin' ? 'Administration' : '',
    entityId: entite?.id ?? null,
  };
}

function roleLabel(role: Role, entite: string | undefined): string {
  const suffix = entite ? ` — ${entite}` : '';
  switch (role) {
    case 'agence':
      return `Entité émettrice${suffix}`;
    case 'accueil':
      return `Entité réceptrice${suffix}`;
    case 'traitement':
      return `Entité de traitement${suffix}`;
    case 'manager':
      return 'Pilotage';
    case 'admin':
      return 'Administrateur';
  }
}
