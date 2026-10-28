import type { Dataset } from './datasets';

/**
 * Jeu interne : réseau d'agences et produits réels, confidentiel. Il n'est jamais versionné :
 * les données vivent dans `datasets.interne.local.ts` (ignoré par Git), chargé par la
 * configuration de build `interne` (`ng serve --configuration interne`).
 * Sans elle, l'application ne propose que les jeux neutre et entreprise.
 */
export const INTERNE_DATASET: Dataset | null = null;
