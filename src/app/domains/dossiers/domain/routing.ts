import { DossierType } from './dossier-catalog';

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
