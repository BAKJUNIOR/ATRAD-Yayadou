import {
  DOSSIER_TYPES,
  DossierType,
  ProduitOption,
  TypeField,
  setDossierTypes,
  setTypeCatalog,
} from './dossier-catalog';
import type { ApiTransition } from './entities/dossier-api.entity';
import type { MotifOption } from './entities/referentiel.entity';

/** Capacités d'une entité : émettre des états, les réceptionner, traiter des dossiers. */
export type EntityCapability = 'emet' | 'recep' | 'trait';

export interface Entite {
  /** Identifiant (UUID) dans l'API. */
  id?: string;
  /** Code au format `AA-000`, identifiant stable de l'entité. */
  code: string;
  nom: string;
  nature: string;
  emet: boolean;
  recep: boolean;
  trait: boolean;
}

/** Type d'état de transmission : une entité réceptrice et les entités autorisées à émettre. */
export interface EtatType {
  id: string;
  nom: string;
  /** Code de l'entité réceptrice. */
  recep: string;
  /** Codes des entités émettrices autorisées. */
  emet: string[];
}

/** Circuit d'un type de dossier : type d'état qui le transmet et entité qui le traite. */
export interface Circuit {
  /** Identifiant du type d'état, vide tant que le type n'est pas rattaché. */
  et: string;
  /** Code de l'entité de traitement, vide si aucune n'est paramétrée. */
  trait: string;
  /** Entité de traitement retirée ou privée de sa capacité : circuit à vérifier. */
  check: boolean;
}

/** Libellés remplaçant « Tiers » (ex-« Client ») et « Dossier » dans toute l'application. */
export interface Vocabulary {
  tiers: string;
  dossier: string;
}

export const DEFAULT_VOCABULARY: Vocabulary = { tiers: 'Tiers', dossier: 'Dossier' };

/**
 * Création d'un état par l'entité émettrice : choix du type d'état d'abord, ou génération
 * automatique d'un état par type d'état à la validation.
 */
export type SaisieMode = 'choix' | 'auto';

/** Paramétrage de l'administrateur : entités, types d'état et circuits. */
export interface Referentiel {
  entites: Entite[];
  etatTypes: EtatType[];
  dossierTypes: DossierType[];
  circuits: Record<DossierType, Circuit>;
  saisieMode: SaisieMode;
  vocab: Vocabulary;
  /** Identifiant (UUID) de chaque type de dossier dans l'API. */
  typeIds: Record<DossierType, string>;
  /** Champs, pièces et produits de chaque type lus dans l'API. */
  typeFields: Record<DossierType, TypeField[]>;
  typePieces: Record<DossierType, string[]>;
  typeOperations: Record<DossierType, ProduitOption[]>;
  motifsRetour: MotifOption[];
  typeCircuits: Record<DossierType, string>;
  workflows: Record<string, ApiTransition[]>;
}

export const NATURES = ['Agence', 'Service', 'Département', 'Direction', 'Cellule', 'Autre'];

export const CAPABILITIES: readonly { key: EntityCapability; label: string; chip: string }[] = [
  { key: 'emet', label: 'Peut saisir et émettre des dossiers', chip: 'Émet' },
  { key: 'recep', label: 'Peut réceptionner des états', chip: 'Réceptionne' },
  { key: 'trait', label: 'Peut traiter des dossiers', chip: 'Traite' },
];

/** Paramétrage vide, en attendant celui de l'API (rien n'est affiché tant qu'elle n'a pas répondu). */
export function emptyReferentiel(): Referentiel {
  return {
    entites: [],
    etatTypes: [],
    dossierTypes: [],
    circuits: {},
    saisieMode: 'choix',
    vocab: { ...DEFAULT_VOCABULARY },
    typeIds: {},
    typeFields: {},
    typePieces: {},
    typeOperations: {},
    motifsRetour: [],
    typeCircuits: {},
    workflows: {},
  };
}

// Paramétrage en vigueur. `ReferentielStore` le remplace par celui de l'administrateur ; les
// fonctions de ce fichier le lisent pour rester utilisables hors injection.
let current: Referentiel = emptyReferentiel();

export function setReferentiel(referentiel: Referentiel): void {
  current = referentiel;
  setDossierTypes(referentiel.dossierTypes);
  setTypeCatalog(referentiel.typeFields, referentiel.typePieces, referentiel.typeOperations);
}

export function referentiel(): Referentiel {
  return current;
}

// ------------------------------------------------------------------ Entités

export function entites(): readonly Entite[] {
  return current.entites;
}

export function entiteByCode(code: string): Entite | undefined {
  return current.entites.find((entite) => entite.code === code);
}

/** `Agence Plateau (AG-014)` → `AG-014` ; une chaîne sans code est rendue telle quelle. */
export function entityCode(label: string): string {
  const match = String(label ?? '').match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : String(label ?? '');
}

/** Entité désignée par son libellé complet ou son code. */
export function entiteOf(label: string): Entite | undefined {
  return entiteByCode(entityCode(label));
}

/** `AG-014` → `Agence Plateau (AG-014)` */
export function entityLabel(code: string): string {
  const entite = entiteByCode(code);
  return entite ? labelOf(entite) : code;
}

export function labelOf(entite: Pick<Entite, 'nom' | 'code'>): string {
  return `${entite.nom} (${entite.code})`;
}

/** Libellé à jour d'une entité désignée par un ancien libellé (renommage par l'administrateur). */
export function normalizeEntity(label: string): string {
  if (!label) {
    return label;
  }
  const entite = entiteOf(label);
  return entite ? labelOf(entite) : label;
}

/** `Service Crédits` → `Crédits` */
export function shortName(nom: string): string {
  return String(nom ?? '').replace(/^(Service|Entité|Département|Direction|Cellule)\s+/i, '');
}

/** Une entité inconnue du référentiel (compte hors paramétrage) garde tous ses droits. */
export function hasCapability(label: string, capability: EntityCapability): boolean {
  const entite = entiteOf(label);
  return entite ? entite[capability] : true;
}

export function traitEntites(): Entite[] {
  return current.entites.filter((entite) => entite.trait);
}

// -------------------------------------------------------------- Types d'état

/** Types d'état avec les types de dossier que leur rattachent les circuits. */
export interface EtatTypeView extends EtatType {
  dossiers: DossierType[];
}

export function etatTypes(): EtatTypeView[] {
  return current.etatTypes.map((etatType) => ({
    ...etatType,
    dossiers: DOSSIER_TYPES.filter((type) => circuit(type).et === etatType.id),
  }));
}

export function etatTypeById(id: string): EtatTypeView | undefined {
  return etatTypes().find((etatType) => etatType.id === id);
}

/** Types d'état qu'une entité émettrice est autorisée à utiliser. */
export function etatTypesFor(emetCode: string): EtatTypeView[] {
  return etatTypes().filter((etatType) => etatType.emet.includes(emetCode));
}

export function etatTypeOfDossier(type: DossierType): EtatTypeView | undefined {
  return etatTypes().find((etatType) => etatType.dossiers.includes(type));
}

/** Prochain identifiant libre : `TE-04`. */
export function nextEtatTypeId(): string {
  const max = current.etatTypes.reduce(
    (highest, etatType) => Math.max(highest, parseInt(etatType.id.replace(/\D/g, ''), 10) || 0),
    0,
  );
  return `TE-${String(max + 1).padStart(2, '0')}`;
}

// ----------------------------------------------------------------- Circuits

export function circuit(type: DossierType): Circuit {
  const saved = current.circuits[type];
  if (!saved) {
    return { et: '', trait: '', check: false };
  }
  const etOk = current.etatTypes.some((etatType) => etatType.id === saved.et);
  const traitOk = !!saved.trait && !!entiteByCode(saved.trait)?.trait;
  return {
    et: etOk ? saved.et : '',
    trait: traitOk ? saved.trait : '',
    check: saved.check || (!!saved.trait && !traitOk) || (!!saved.et && !etOk),
  };
}

/** Types de dossier sans type d'état ou sans entité de traitement : ils ne peuvent être saisis. */
export function circuitsMissing(): DossierType[] {
  return DOSSIER_TYPES.filter((type) => {
    const { et, trait } = circuit(type);
    return !et || !trait;
  });
}

/** Entité de traitement d'un type de dossier (libellé complet), vide si aucune. */
export function traitLabelOf(type: DossierType): string {
  const { trait } = circuit(type);
  return trait ? entityLabel(trait) : '';
}

// --------------------------------------------------------- Saisie et envoi

/** Entité réceptrice d'un état (code), vide si l'état n'en a pas. */
export function recepOf(etat: { recep?: string } | null | undefined): string {
  return etat?.recep || '';
}

/** Types de dossier qu'une entité peut saisir, selon le mode de saisie et le type d'état choisi. */
export function allowedTypes(emetCode: string, etatTypeId: string): DossierType[] {
  const ready = (type: DossierType): boolean => !!circuit(type).trait;
  if (current.saisieMode === 'auto') {
    const mine = etatTypesFor(emetCode);
    return DOSSIER_TYPES.filter(
      (type) => ready(type) && mine.some((etatType) => etatType.dossiers.includes(type)),
    );
  }
  const chosen = currentEtatType(emetCode, etatTypeId);
  return chosen
    ? DOSSIER_TYPES.filter((type) => ready(type) && chosen.dossiers.includes(type))
    : [];
}

/** Type d'état retenu pour la saisie : celui choisi s'il est autorisé, sinon le premier. */
export function currentEtatType(emetCode: string, etatTypeId: string): EtatTypeView | undefined {
  const mine = etatTypesFor(emetCode);
  return mine.find((etatType) => etatType.id === etatTypeId) ?? mine[0];
}

export interface DraftGroup<T> {
  etatType: EtatTypeView;
  dossiers: T[];
}

/**
 * Répartit les dossiers d'un brouillon en états, un par type d'état. Les dossiers qu'aucun type
 * d'état autorisé n'accepte sont rendus à part : ils bloquent la transmission.
 */
export function draftGroups<T extends { type: DossierType }>(
  draft: readonly T[],
  emetCode: string,
  etatTypeId: string,
): { groups: DraftGroup<T>[]; miss: T[] } {
  const groups: DraftGroup<T>[] = [];
  const miss: T[] = [];
  const auto = current.saisieMode === 'auto';
  const chosen = currentEtatType(emetCode, etatTypeId);
  for (const dossier of draft) {
    const etatType = auto ? etatTypeOfDossier(dossier.type) : chosen;
    if (
      !etatType ||
      !etatType.dossiers.includes(dossier.type) ||
      !etatType.emet.includes(emetCode)
    ) {
      miss.push(dossier);
      continue;
    }
    let group = groups.find((candidate) => candidate.etatType.id === etatType.id);
    if (!group) {
      group = { etatType, dossiers: [] };
      groups.push(group);
    }
    group.dossiers.push(dossier);
  }
  return { groups, miss };
}

// ---------------------------------------------------------- Administration

/** Fiche d'une entité en cours de saisie ; `orig` est le code de l'entité modifiée. */
export interface EntiteDraft extends Entite {
  orig: string | null;
}

export function entiteErrors(draft: EntiteDraft): string[] {
  const errors: string[] = [];
  const code = draft.code.trim().toUpperCase();
  if (!code) {
    errors.push('Le code est obligatoire.');
  } else if (!/^[A-Z]{2}-\d{3}$/.test(code)) {
    errors.push('Code au format AA-000 (ex. AG-045).');
  } else if (!draft.orig && current.entites.some((entite) => entite.code === code)) {
    errors.push(`Le code ${code} existe déjà.`);
  }
  if (!draft.nom.trim()) {
    errors.push('Le nom est obligatoire.');
  }
  if (!draft.emet && !draft.recep && !draft.trait) {
    errors.push('Cochez au moins une capacité.');
  }
  if (draft.orig) {
    const types = etatTypes();
    const asRecep = types.filter((t) => t.recep === draft.orig).map((t) => `« ${t.nom} »`);
    if (!draft.recep && asRecep.length) {
      errors.push(
        `Cette entité est réceptrice du type d'état ${asRecep.join(', ')} : changez d'abord la réceptrice de ce type.`,
      );
    }
    const asEmet = types.filter((t) => t.emet.includes(draft.orig!)).map((t) => `« ${t.nom} »`);
    if (!draft.emet && asEmet.length) {
      errors.push(
        `Cette entité est émettrice dans ${asEmet.join(', ')} : retirez-la d'abord de ce type d'état.`,
      );
    }
  }
  return errors;
}

/** Type d'état en cours de saisie ; `orig` est l'identifiant du type modifié. */
export interface EtatTypeDraft {
  orig: string | null;
  nom: string;
  recep: string;
  emet: string[];
}

export function etatTypeErrors(draft: EtatTypeDraft): string[] {
  const errors: string[] = [];
  const nom = draft.nom.trim();
  const types = etatTypes();
  if (!nom) {
    errors.push("Le nom du type d'état est obligatoire.");
  } else if (
    types.some((t) => t.id !== draft.orig && t.nom.trim().toLowerCase() === nom.toLowerCase())
  ) {
    errors.push("Un type d'état porte déjà ce nom.");
  }
  if (!draft.recep) {
    errors.push("Choisissez l'entité réceptrice.");
  }
  const original = draft.orig ? types.find((t) => t.id === draft.orig) : undefined;
  if (original && original.dossiers.length && draft.recep !== original.recep) {
    errors.push(
      `L'entité réceptrice ne peut pas changer : ${original.dossiers.length} type(s) de dossier sont rattachés. Détachez-les d'abord dans Routage & affectation.`,
    );
  }
  return errors;
}

/** Message d'erreur de l'ajout d'un type de dossier, ou chaîne vide. */
export function newDossierTypeError(nom: string, trait: string): string {
  const name = nom.trim();
  if (!name) {
    return 'Le nom est obligatoire.';
  }
  if (DOSSIER_TYPES.some((type) => type.toLowerCase() === name.toLowerCase())) {
    return 'Ce type de dossier existe déjà.';
  }
  return trait ? '' : "Choisissez l'entité de traitement.";
}

/**
 * Type d'état et entité réceptrice d'un état. Un état antérieur aux types d'état est rattaché
 * au type d'état de son premier dossier.
 */
export function etatInfo(
  etat:
    | {
        etType?: string;
        etTypeNom?: string;
        recep?: string;
        dest?: string;
        dossiers?: readonly { type: DossierType }[];
      }
    | null
    | undefined,
): { nom: string; dest: string } {
  if (!etat) {
    return { nom: '—', dest: '—' };
  }
  const etatType =
    etatTypes().find((candidate) => candidate.id === etat.etType) ??
    (etat.etTypeNom ? undefined : etatTypeOfDossier(etat.dossiers?.[0]?.type ?? ''));
  const nom = etat.etTypeNom || etatType?.nom || '—';
  const dest = etat.recep
    ? entityLabel(etat.recep)
    : etatType
      ? entityLabel(etatType.recep)
      : normalizeEntity(etat.dest ?? '') || '—';
  return { nom, dest };
}
