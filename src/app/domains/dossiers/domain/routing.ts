import { DossierType, Priorite } from './dossier-catalog';

export interface EntiteTraitement {
  name: string;
  short: string;
}

export const ENTITES: readonly EntiteTraitement[] = [
  { name: 'Entité Crédits (ET-007)', short: 'Crédits' },
  { name: 'Entité Monétique (ET-012)', short: 'Monétique' },
  { name: 'Service Réclamations (ET-020)', short: 'Réclamations' },
  { name: 'Entité Conformité (ET-031)', short: 'Conformité' },
];

/**
 * Routage par défaut d'un type de dossier vers son entité de traitement.
 * Deviendra paramétrable par l'administrateur (écran « Routage & affectation »).
 */
const DEFAULT_MAPPING: Record<DossierType, string> = {
  'Ouverture de compte': 'Entité Crédits (ET-007)',
  'Demande de prêt': 'Entité Crédits (ET-007)',
  Réclamation: 'Service Réclamations (ET-020)',
  'Mise à jour KYC': 'Entité Conformité (ET-031)',
  'Clôture de compte': 'Entité Crédits (ET-007)',
};

export function entityOf(type: DossierType): string {
  return current.map[type] ?? '';
}

/** Entité effective d'un dossier : celle du routage réel s'il a eu lieu, sinon celle prévue. */
export function entityOfDossier(dossier: { type: DossierType; entite?: string }): string {
  return dossier.entite || entityOf(dossier.type) || '—';
}

export function shortEntity(name: string): string {
  return ENTITES.find((entite) => entite.name === name)?.short ?? name;
}

/** `Crédits (2), Réclamations (1)` */
export function entitySummary(dossiers: readonly { type: DossierType; entite?: string }[]): string {
  const counts = new Map<string, number>();
  for (const dossier of dossiers) {
    const key = shortEntity(entityOfDossier(dossier));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => `${name} (${count})`).join(', ');
}

/** Façon dont une entité répartit les dossiers qu'elle reçoit. */
export type AssignmentMode = 'auto' | 'pool' | 'disp';

/** Modes proposés à l'administrateur, avec leur explication. */
export const MODES: readonly { id: AssignmentMode; label: string; description: string }[] = [
  {
    id: 'auto',
    label: 'Automatique',
    description:
      "À la réception, chaque dossier est attribué à tour de rôle aux gestionnaires de l'équipe.",
  },
  {
    id: 'pool',
    label: 'Pool partagé',
    description:
      "Les dossiers arrivent dans le « Pool de dossiers » de l'entité ; chaque membre de l'équipe se sert (« S'attribuer des dossiers »).",
  },
  {
    id: 'disp',
    label: 'Via un répartiteur',
    description:
      "Les dossiers arrivent dans un bac ; le ou les répartiteurs désignés les attribuent à une personne de l'équipe.",
  },
];

export const MODE_LABEL: Record<AssignmentMode, string> = {
  auto: 'Automatique (tour de rôle)',
  pool: 'Pool partagé',
  disp: 'Via un répartiteur',
};

export interface EntitySettings {
  mode: AssignmentMode;
  team: string[];
  /** Répartiteurs : membres qui attribuent les dossiers en mode « Via un répartiteur ». */
  dispatchers: string[];
  /** Membres autorisés à rechercher parmi tous les dossiers de l'entité. */
  searchers: string[];
}

/**
 * Paramétrage par défaut des entités (mode de répartition, équipe et droits).
 */
const DEFAULT_ENTITY_SETTINGS: Record<string, EntitySettings> = {
  'Entité Crédits (ET-007)': {
    mode: 'disp',
    team: ['Fatou Bamba', 'Éric Tanoh', 'Clarisse Yao'],
    dispatchers: ['Éric Tanoh'],
    searchers: ['Fatou Bamba', 'Éric Tanoh'],
  },
  'Entité Monétique (ET-012)': {
    mode: 'auto',
    team: ['Éric Tanoh'],
    dispatchers: [],
    searchers: [],
  },
  'Service Réclamations (ET-020)': {
    mode: 'auto',
    team: ['Fatou Bamba', 'Ismaël Ouédraogo'],
    dispatchers: [],
    searchers: [],
  },
  'Entité Conformité (ET-031)': {
    mode: 'auto',
    team: ['Clarisse Yao', 'Ismaël Ouédraogo'],
    dispatchers: [],
    searchers: ['Clarisse Yao'],
  },
};

/** Gestionnaires pouvant être rattachés à une entité. */
export const ALL_GESTIONNAIRES: readonly string[] = [
  'Fatou Bamba',
  'Éric Tanoh',
  'Clarisse Yao',
  'Ismaël Ouédraogo',
];

/** Paramétrage du routage : entité de chaque type de dossier, et réglages de chaque entité. */
export interface RoutingConfig {
  map: Record<DossierType, string>;
  ent: Record<string, EntitySettings>;
}

export function defaultRouting(): RoutingConfig {
  return structuredClone({ map: DEFAULT_MAPPING, ent: DEFAULT_ENTITY_SETTINGS });
}

// Paramétrage en vigueur. `RoutingStore` le remplace par celui de l'administrateur ; les
// fonctions de ce fichier le lisent pour rester utilisables hors injection.
let current: RoutingConfig = defaultRouting();

export function setRoutingConfig(config: RoutingConfig): void {
  current = config;
}

export function entitySettings(entite: string): EntitySettings | undefined {
  return current.ent[entite];
}

/** Droits d'un membre, tels qu'affichés à l'administrateur : `Traiter · Affecter`. */
export function rightsOf(user: string, settings: EntitySettings): string[] {
  const rights = ['Traiter'];
  if (settings.mode === 'pool') {
    rights.push("S'attribuer");
  }
  if (settings.mode === 'disp' && settings.dispatchers.includes(user)) {
    rights.push('Affecter');
  }
  return rights;
}

/** Fonctions d'un membre dans une entité. */
export interface MemberFunctions {
  traiter: boolean;
  /** S'attribuer des dossiers depuis le pool partagé. */
  pool: boolean;
  /** Affecter les dossiers du bac de répartition. */
  affecter: boolean;
  /** Rechercher parmi tous les dossiers de l'entité. */
  rechercher: boolean;
}

export type MemberFunction = keyof MemberFunctions;

export function functionsOf(user: string, entite: string): MemberFunctions {
  const settings = current.ent[entite];
  if (!settings?.team.includes(user)) {
    return { traiter: false, pool: false, affecter: false, rechercher: false };
  }
  return {
    traiter: true,
    pool: settings.mode === 'pool',
    affecter: settings.mode === 'disp' && settings.dispatchers.includes(user),
    rechercher: settings.searchers.includes(user),
  };
}

/** Délai de traitement, en jours, selon la priorité du dossier. */
export const DELAI_PRIORITE: Record<Priorite, number> = { Urgente: 1, Haute: 3, Normale: 5 };

/** `Entité Crédits (ET-007)` → `Crédits` (retire aussi le préfixe des entités hors référentiel). */
export function bareEntity(name: string): string {
  return (name || '—').replace(/^(Entité|Service) /, '').replace(/ \(.*\)$/, '');
}
