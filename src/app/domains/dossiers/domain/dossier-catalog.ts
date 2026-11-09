import { isoDateToFr } from '../../../core/utils/date.util';

export type DossierType = string;

export type Produit = string;

export interface ProduitOption {
  id: string;
  label: string;
}

export const PRIORITES = ['Normale', 'Haute', 'Urgente'] as const;

export type Priorite = (typeof PRIORITES)[number];

export type TypeFieldKind = 'select' | 'number' | 'text' | 'date';

export interface TypeField {
  key: string;
  label: string;
  kind: TypeFieldKind;
  options?: readonly string[];
  placeholder?: string;
  optional?: boolean;
  zeroOk?: boolean;
  unit?: 'FCFA' | 'mois';
  enTete?: boolean;
}

export type RoleCompte = 'AUTRE' | 'COMPTE_CHEQUE' | 'COMPTE_PRODUIT';

export const COMPTE_LABELS: Record<RoleCompte, string> = {
  AUTRE: 'Numéro compte',
  COMPTE_CHEQUE: 'Compte chèque',
  COMPTE_PRODUIT: 'Compte produit',
};

/** Pièce à joindre dans le formulaire (ex. Capture Delta), avec ses formats et sa taille maximale. */
export interface PieceAJoindre {
  libelle: string;
  formats: readonly string[];
  tailleMaxKo: number | null;
  obligatoire: boolean;
}

/** Champs fixes réglés par type de dossier. */
export interface TypeSaisie {
  numeroClient: boolean;
  comptes: readonly RoleCompte[];
  fichier: PieceAJoindre | null;
}

const DEFAULT_SAISIE: TypeSaisie = { numeroClient: true, comptes: ['AUTRE'], fichier: null };

export interface DossierFormLabels {
  type: string;
  produit: string;
  client: string;
  clientPlaceholder: string;
  clientRule: 'digits12' | 'numeroCle' | 'objet';
  clientMax: number;
  prenom: string;
  nom: string;
  compte: string;
  comptePlaceholder: string;
  showProduit: boolean;
  showPrenom: boolean;
  showCompte: boolean;
  showPrio: boolean;
  identityRequired: boolean;
}

export const DOSSIER_FORM: DossierFormLabels = {
  type: 'Type produit',
  produit: 'Nature opération',
  client: 'Numéro client',
  clientPlaceholder: '12 chiffres, ex. 000123456789',
  clientRule: 'digits12',
  clientMax: 12,
  prenom: 'Prénom client',
  nom: 'Nom client',
  compte: 'Numéro compte',
  comptePlaceholder: '9 chiffres',
  showProduit: true,
  showPrenom: true,
  showCompte: true,
  showPrio: false,
  identityRequired: true,
};

// Catalogue lu dans l'API (`setReferentiel`). La liste des types est mise à jour sur place pour que ses lecteurs
// gardent la même référence ; tant que l'API n'a pas répondu, tout est vide.
const types: string[] = [];
let typeFields: Record<string, readonly TypeField[]> = {};
let typePieces: Record<string, readonly string[]> = {};
let typeProduits: Record<string, readonly ProduitOption[]> = {};
let typeSaisies: Record<string, TypeSaisie> = {};

export const DOSSIER_TYPES: readonly DossierType[] = types;

export function setDossierTypes(list: readonly DossierType[]): void {
  types.splice(0, types.length, ...list);
}

export function setTypeCatalog(
  fields: Record<string, readonly TypeField[]>,
  pieces: Record<string, readonly string[]>,
  produits: Record<string, readonly ProduitOption[]> = {},
  saisies: Record<string, TypeSaisie> = {},
): void {
  typeFields = fields;
  typePieces = pieces;
  typeProduits = produits;
  typeSaisies = saisies;
}

export function saisieOf(type: DossierType): TypeSaisie {
  return typeSaisies[type] ?? DEFAULT_SAISIE;
}

export function produitsOf(type: DossierType): readonly Produit[] {
  return (typeProduits[type] ?? []).map((option) => option.label);
}

export function operationIdOf(type: DossierType, produit: Produit): string | null {
  return typeProduits[type]?.find((option) => option.label === produit)?.id ?? null;
}

export function produitLabelOf(type: DossierType, operationId: string | null): Produit {
  return (
    (operationId && typeProduits[type]?.find((option) => option.id === operationId)?.label) || ''
  );
}

export function fieldsOf(type: DossierType): readonly TypeField[] {
  return typeFields[type] ?? [];
}

/** Champ dont la valeur devient le montant du dossier : le premier montant en FCFA qui ne peut pas être nul. */
export function montantFieldOf(type: DossierType): string | undefined {
  return fieldsOf(type).find(
    (field) => field.kind === 'number' && field.unit === 'FCFA' && !field.zeroOk,
  )?.key;
}

export function piecesOf(type: DossierType): readonly string[] {
  return typePieces[type] ?? [];
}

export function displayValue(field: TypeField, raw: string): string {
  if (field.kind === 'number') {
    return formatNumber(raw) + (field.unit ? ` ${field.unit}` : '');
  }
  return field.kind === 'date' ? isoDateToFr(raw) : raw;
}

export function formatNumber(value: string | number): string {
  return String(Math.round(Number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
