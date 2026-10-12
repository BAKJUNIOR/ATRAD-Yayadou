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
export const DEFAULT_MAPPING: Record<DossierType, string> = {
  'Ouverture de compte': 'Entité Crédits (ET-007)',
  'Demande de prêt': 'Entité Crédits (ET-007)',
  Réclamation: 'Service Réclamations (ET-020)',
  'Mise à jour KYC': 'Entité Conformité (ET-031)',
  'Clôture de compte': 'Entité Crédits (ET-007)',
};

export function entityOf(type: DossierType): string {
  return DEFAULT_MAPPING[type] ?? '';
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

export const MODE_LABEL: Record<AssignmentMode, string> = {
  auto: 'Automatique (tour de rôle)',
  pool: 'Pool partagé',
  disp: 'Via un répartiteur',
};

export interface EntitySettings {
  mode: AssignmentMode;
  team: readonly string[];
  /** Répartiteurs : membres qui attribuent les dossiers en mode « Via un répartiteur ». */
  dispatchers: readonly string[];
  /** Membres autorisés à rechercher parmi tous les dossiers de l'entité. */
  searchers: readonly string[];
}

/**
 * Paramétrage par défaut des entités (mode de répartition, équipe et droits).
 * Deviendra modifiable par l'administrateur (écran « Routage & affectation »).
 */
export const ENTITY_SETTINGS: Record<string, EntitySettings> = {
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
  const settings = ENTITY_SETTINGS[entite];
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
