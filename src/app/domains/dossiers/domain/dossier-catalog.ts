import { Dataset, DatasetId, datasetOf } from './datasets';

/** Type de dossier : propre au jeu de données, complété par l'administrateur. */
export type DossierType = string;

/** Produit (ou nature d'opération) du dossier, selon le jeu de données. */
export type Produit = string;

export const PRIORITES = ['Normale', 'Haute', 'Urgente'] as const;

export type Priorite = (typeof PRIORITES)[number];

export type TypeFieldKind = 'select' | 'number' | 'text' | 'date';

/** Champ propre à un type de dossier, ajouté au formulaire de saisie. */
export interface TypeField {
  key: string;
  label: string;
  kind: TypeFieldKind;
  options?: readonly string[];
  placeholder?: string;
  optional?: boolean;
  /** Un montant nul est accepté (ex. apport personnel). */
  zeroOk?: boolean;
  unit?: 'FCFA' | 'mois';
}

// Jeu de données actif. `ReferentielStore` l'active au démarrage ; le jeu neutre sert par défaut
// (et aux tests). Les listes ci-dessous sont mises à jour sur place pour que leurs lecteurs
// gardent la même référence.
let active: Dataset = datasetOf('neutre');
const types: string[] = [...active.types];
const produits: string[] = [...active.produits];

/** Types de dossier en vigueur. */
export const DOSSIER_TYPES: readonly DossierType[] = types;

export const PRODUITS: readonly Produit[] = produits;

export function dataset(): Dataset {
  return active;
}

export function activateDataset(id: DatasetId): void {
  active = datasetOf(id);
  produits.splice(0, produits.length, ...active.produits);
  setDossierTypes(active.types);
}

/** Remplace la liste des types de dossier (paramétrage de l'administrateur). */
export function setDossierTypes(list: readonly DossierType[]): void {
  const next = list.length ? list : active.types;
  types.splice(0, types.length, ...next);
}

/** Champs propres à un type ; un type ajouté par l'administrateur reçoit ceux du jeu. */
export function fieldsOf(type: DossierType): readonly TypeField[] {
  return active.typeFields[type] ?? active.addedTypeFields;
}

/** Champ dont la valeur devient le montant du dossier, pour les types qui en ont un. */
export function montantFieldOf(type: DossierType): string | undefined {
  return active.montantField[type];
}

/** Pièces attendues pour un type de dossier, proposées lors d'une demande de documents. */
export function piecesOf(type: DossierType): readonly string[] {
  return active.pieces[type] ?? [];
}

/** `1250000` → `1 250 000` */
export function formatNumber(value: string | number): string {
  return String(Math.round(Number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
