import { isoDateToFr } from '../../../core/utils/date.util';

/** Type de dossier, paramétré par l'administrateur dans l'API. */
export type DossierType = string;

/** Produit (opération) du dossier, paramétré pour chaque type dans l'API. */
export type Produit = string;

/** Produit proposé pour un type de dossier, avec son identifiant d'opération dans l'API. */
export interface ProduitOption {
  id: string;
  label: string;
}

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

/** Libellés et règles du formulaire de saisie d'un dossier. */
export interface DossierFormLabels {
  type: string;
  produit: string;
  client: string;
  clientPlaceholder: string;
  /** Saisie du n° client : 12 chiffres, numéro + clé, ou objet libre. */
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
  /** Prénom, nom et compte obligatoires. */
  identityRequired: boolean;
}

export const DOSSIER_FORM: DossierFormLabels = {
  type: 'Type de dossier',
  produit: 'Type de produit',
  client: 'Numéro client',
  clientPlaceholder: '12 chiffres, ex. 000123456789',
  clientRule: 'digits12',
  clientMax: 12,
  prenom: 'Prénom du client',
  nom: 'Nom du client',
  compte: 'N° de compte',
  comptePlaceholder: 'CPT-0000000',
  showProduit: true,
  showPrenom: true,
  showCompte: true,
  showPrio: true,
  identityRequired: false,
};

// Catalogue lu dans l'API (`setReferentiel`). La liste des types est mise à jour sur place pour que ses lecteurs
// gardent la même référence ; tant que l'API n'a pas répondu, tout est vide.
const types: string[] = [];
let typeFields: Record<string, readonly TypeField[]> = {};
let typePieces: Record<string, readonly string[]> = {};
let typeProduits: Record<string, readonly ProduitOption[]> = {};

/** Types de dossier en vigueur. */
export const DOSSIER_TYPES: readonly DossierType[] = types;

/** Remplace la liste des types de dossier (paramétrage de l'administrateur). */
export function setDossierTypes(list: readonly DossierType[]): void {
  types.splice(0, types.length, ...list);
}

/** Champs et pièces des types de dossier, tels que paramétrés dans l'API. */
export function setTypeCatalog(
  fields: Record<string, readonly TypeField[]>,
  pieces: Record<string, readonly string[]>,
  produits: Record<string, readonly ProduitOption[]> = {},
): void {
  typeFields = fields;
  typePieces = pieces;
  typeProduits = produits;
}

/** Produits proposés pour un type, vide si l'API n'en paramètre aucun. */
export function produitsOf(type: DossierType): readonly Produit[] {
  return (typeProduits[type] ?? []).map((option) => option.label);
}

/** Identifiant d'opération d'un produit pour un type. */
export function operationIdOf(type: DossierType, produit: Produit): string | null {
  return typeProduits[type]?.find((option) => option.label === produit)?.id ?? null;
}

/** Libellé du produit d'un dossier à partir de son identifiant d'opération. */
export function produitLabelOf(type: DossierType, operationId: string | null): Produit {
  return (
    (operationId && typeProduits[type]?.find((option) => option.id === operationId)?.label) || ''
  );
}

/** Champs propres à un type, tels que paramétrés dans l'API. */
export function fieldsOf(type: DossierType): readonly TypeField[] {
  return typeFields[type] ?? [];
}

/** Champ dont la valeur devient le montant du dossier : le premier montant en FCFA qui ne peut pas être nul. */
export function montantFieldOf(type: DossierType): string | undefined {
  return fieldsOf(type).find(
    (field) => field.kind === 'number' && field.unit === 'FCFA' && !field.zeroOk,
  )?.key;
}

/** Pièces attendues pour un type de dossier, proposées lors d'une demande de documents. */
export function piecesOf(type: DossierType): readonly string[] {
  return typePieces[type] ?? [];
}

/** Valeur d'un champ propre au type, mise en forme pour l'affichage (nombre groupé et unité, date française). */
export function displayValue(field: TypeField, raw: string): string {
  if (field.kind === 'number') {
    return formatNumber(raw) + (field.unit ? ` ${field.unit}` : '');
  }
  return field.kind === 'date' ? isoDateToFr(raw) : raw;
}

/** `1250000` → `1 250 000` */
export function formatNumber(value: string | number): string {
  return String(Math.round(Number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
