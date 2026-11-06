import { Utilisateur } from './utilisateur.entity';

export const ROLES = ['agence', 'accueil', 'traitement', 'manager', 'admin'] as const;

export type Role = (typeof ROLES)[number];

export interface Account {
  id: string;
  /** Profil affiché : le premier des profils de l'utilisateur, dans l'ordre de `ROLES`. */
  role: Role;
  roles: Role[];
  ident: string;
  name: string;
  roleLabel: string;
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
