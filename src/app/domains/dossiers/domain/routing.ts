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
  name: string;
  short: string;
}

// Entités de traitement du référentiel, mises à jour sur place par `syncEntites()` pour que
// leurs lecteurs gardent la même référence.
const entitesTraitement: EntiteTraitement[] = [];

export const ENTITES: readonly EntiteTraitement[] = entitesTraitement;

export function syncEntites(): void {
  entitesTraitement.splice(
    0,
    entitesTraitement.length,
    ...traitEntites().map((entite) => ({ name: labelOf(entite), short: shortName(entite.nom) })),
  );
}

syncEntites();

export function entityOf(type: DossierType): string {
  return traitLabelOf(type);
}

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

export function entitySummary(dossiers: readonly { type: DossierType; entite?: string }[]): string {
  const counts = new Map<string, number>();
  for (const dossier of dossiers) {
    const key = shortEntity(entityOfDossier(dossier));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => `${name} (${count})`).join(', ');
}

export type AssignmentMode = 'auto' | 'pool' | 'disp';

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
  dispatchers: string[];
  searchers: string[];
}

function emptySettings(): EntitySettings {
  return { mode: 'auto', team: [], dispatchers: [], searchers: [] };
}

export interface RoutingConfig {
  ent: Record<string, EntitySettings>;
}

// Paramétrage en vigueur. `RoutingStore` le remplace par celui de l'administrateur ; les
// fonctions de ce fichier le lisent pour rester utilisables hors injection.
let current: RoutingConfig = { ent: {} };

export function setRoutingConfig(config: RoutingConfig): void {
  current = config;
}

export function entitySettings(entite: string): EntitySettings | undefined {
  const code = entityCode(entite);
  if (!traitEntites().some((candidate) => candidate.code === code)) {
    return undefined;
  }
  return current.ent[code] ?? emptySettings();
}

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

export interface MemberFunctions {
  traiter: boolean;
  pool: boolean;
  affecter: boolean;
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

export const DELAI_PRIORITE: Record<Priorite, number> = { Urgente: 1, Haute: 3, Normale: 5 };

export function bareEntity(name: string): string {
  return shortName((name || '—').replace(/ \(.*\)$/, ''));
}
