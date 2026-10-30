import { DossierType, Priorite } from './dossier-catalog';
import {
  entityCode,
  labelOf,
  normalizeEntity,
  shortName,
  traitEntites,
  traitLabelOf,
} from './referentiel';

export interface EntiteTraitement {
  /** Libellé complet : `Service Crédits (ET-007)`. */
  name: string;
  short: string;
}

// Entités de traitement du référentiel, mises à jour sur place par `syncEntites()` pour que
// leurs lecteurs gardent la même référence.
const entitesTraitement: EntiteTraitement[] = [];

export const ENTITES: readonly EntiteTraitement[] = entitesTraitement;

/** Recalcule la liste des entités de traitement après un changement du référentiel. */
export function syncEntites(): void {
  entitesTraitement.splice(
    0,
    entitesTraitement.length,
    ...traitEntites().map((entite) => ({ name: labelOf(entite), short: shortName(entite.nom) })),
  );
}

syncEntites();

/** Entité de traitement prévue pour un type de dossier (circuit de l'administrateur). */
export function entityOf(type: DossierType): string {
  return traitLabelOf(type);
}

/** Entité effective d'un dossier : celle du routage réel s'il a eu lieu, sinon celle prévue. */
export function entityOfDossier(dossier: { type: DossierType; entite?: string }): string {
  return normalizeEntity(dossier.entite ?? '') || entityOf(dossier.type) || '—';
}

export function shortEntity(name: string): string {
  const label = normalizeEntity(name);
  return (
    ENTITES.find((entite) => entite.name === label)?.short ??
    shortName(label.replace(/ \([^)]*\)$/, ''))
  );
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

/** Réglages d'une entité dont l'API n'a pas encore donné la répartition : aucune équipe. */
function emptySettings(): EntitySettings {
  return { mode: 'auto', team: [], dispatchers: [], searchers: [] };
}

/** Répartition interne de chaque entité de traitement, par code d'entité. */
export interface RoutingConfig {
  ent: Record<string, EntitySettings>;
}

// Paramétrage en vigueur. `RoutingStore` le remplace par celui de l'administrateur ; les
// fonctions de ce fichier le lisent pour rester utilisables hors injection.
let current: RoutingConfig = { ent: {} };

export function setRoutingConfig(config: RoutingConfig): void {
  current = config;
}

/** Réglages d'une entité désignée par son libellé ou son code (répartition lue dans l'API). */
export function entitySettings(entite: string): EntitySettings | undefined {
  const code = entityCode(entite);
  if (!traitEntites().some((candidate) => candidate.code === code)) {
    return undefined;
  }
  return current.ent[code] ?? emptySettings();
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
  const settings = entitySettings(entite);
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

/** `Service Crédits (ET-007)` → `Crédits` (retire aussi le préfixe des entités hors référentiel). */
export function bareEntity(name: string): string {
  return shortName((name || '—').replace(/ \(.*\)$/, ''));
}
