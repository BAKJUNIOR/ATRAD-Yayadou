import { DossierType, ProduitOption, RoleCompte, TypeField, TypeSaisie } from '../dossier-catalog';
import { Circuit, Entite, EtatType, SaisieMode } from '../referentiel';
import type { ApiTransition } from './dossier-api.entity';

export interface ApiEntite {
  id: string;
  code: string;
  nom: string;
  nature: string;
  parentId: string | null;
  peutEmettre: boolean;
  peutReceptionner: boolean;
  peutTraiter: boolean;
  modeRepartition: 'AUTOMATIQUE' | 'POOL' | 'REPARTITEUR';
  actif: boolean;
}

export interface ApiTypeEtat {
  id: string;
  code: string;
  nom: string;
  entiteReceptriceId: string;
  emettriceIds: string[];
  actif: boolean;
}

export interface ApiTypeDossier {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  typeEtatId: string | null;
  entiteTraitementId: string | null;
  circuit: string;
  delaiTraitementJours: number | null;
  actif: boolean;
  rattache: boolean;
  numeroClientRequis?: boolean;
  comptes?: RoleCompte[];
}

export type ApiTypeDonnee = 'TEXTE' | 'NOMBRE' | 'DATE' | 'LISTE' | 'EMAIL' | 'BOOLEEN';

export interface ApiChamp {
  code: string;
  libelle: string;
  typeDonnee: ApiTypeDonnee;
  obligatoire: boolean;
  unite: string | null;
  motifRegex: string | null;
  aide: string | null;
  valeurs: { code: string; libelle: string }[];
  enTete?: boolean;
}

export interface ApiPieceAttendue {
  libelle: string;
  obligatoire: boolean;
  formats?: string | null;
  tailleMaxKo?: number | null;
}

export interface ApiFormulaire {
  typeDossier: ApiTypeDossier;
  champs: ApiChamp[];
  pieces: ApiPieceAttendue[];
  operations: ApiOperation[];
}

export interface ApiOperation {
  id: string;
  code: string;
  libelle: string;
}

export interface ApiParametrage {
  entites: ApiEntite[];
  typesEtat: ApiTypeEtat[];
  typesDossier: ApiTypeDossier[];
  modeSaisie: 'CHOIX' | 'AUTO';
  formulaires: ApiFormulaire[];
  motifsRetour: ApiMotif[];
  circuits: ApiCircuit[];
}

export interface ReferentielApiPart {
  entites: Entite[];
  etatTypes: EtatType[];
  dossierTypes: DossierType[];
  circuits: Record<DossierType, Circuit>;
  saisieMode: SaisieMode;
  typeIds: Record<DossierType, string>;
  typeFields: Record<DossierType, TypeField[]>;
  typePieces: Record<DossierType, string[]>;
  typeOperations: Record<DossierType, ProduitOption[]>;
  typeSaisies: Record<DossierType, TypeSaisie>;
  motifsRetour: MotifOption[];
  typeCircuits: Record<DossierType, string>;
  workflows: Record<string, ApiTransition[]>;
}

export interface ApiCircuit {
  code: string;
  libelle: string;
  transitions: ApiTransition[];
}

export interface MotifOption {
  id: string;
  label: string;
}

export interface ApiMotif {
  id: string;
  parentId: string | null;
  libelle: string;
}

export function referentielFromApi(api: ApiParametrage): ReferentielApiPart {
  const codeOf = new Map(api.entites.map((entite) => [entite.id, entite.code]));
  const typesDossier = api.typesDossier.filter((type) => type.actif);
  const formulaireOf = new Map(
    api.formulaires.map((formulaire) => [formulaire.typeDossier.id, formulaire]),
  );
  const parType = <T>(value: (type: ApiTypeDossier) => T): Record<DossierType, T> =>
    Object.fromEntries(typesDossier.map((type) => [type.nom, value(type)]));

  return {
    entites: api.entites.map((entite) => ({
      id: entite.id,
      code: entite.code,
      nom: entite.nom,
      nature: entite.nature,
      emet: entite.peutEmettre,
      recep: entite.peutReceptionner,
      trait: entite.peutTraiter,
    })),
    etatTypes: api.typesEtat
      .filter((type) => type.actif)
      .map((type) => ({
        id: type.id,
        nom: type.nom,
        recep: codeOf.get(type.entiteReceptriceId) ?? '',
        emet: type.emettriceIds
          .map((id) => codeOf.get(id))
          .filter((code): code is string => !!code),
      })),
    dossierTypes: typesDossier.map((type) => type.nom),
    circuits: parType((type) => ({
      et: type.typeEtatId ?? '',
      trait: (type.entiteTraitementId && codeOf.get(type.entiteTraitementId)) || '',
      check: false,
    })),
    saisieMode: api.modeSaisie === 'AUTO' ? 'auto' : 'choix',
    typeIds: parType((type) => type.id),
    typeFields: parType((type) => (formulaireOf.get(type.id)?.champs ?? []).map(fieldOf)),
    typePieces: parType((type) =>
      (formulaireOf.get(type.id)?.pieces ?? []).map((piece) => piece.libelle),
    ),
    typeSaisies: parType((type) => saisieFromApi(type, formulaireOf.get(type.id)?.pieces ?? [])),
    motifsRetour: api.motifsRetour.map((motif) => ({ id: motif.id, label: motif.libelle })),
    typeCircuits: parType((type) => type.circuit),
    workflows: Object.fromEntries(
      api.circuits.map((circuit) => [circuit.code, circuit.transitions]),
    ),
    typeOperations: parType((type) =>
      (formulaireOf.get(type.id)?.operations ?? []).map((operation) => ({
        id: operation.id,
        label: operation.libelle,
      })),
    ),
  };
}

export function formatsOf(piece: ApiPieceAttendue): string[] {
  return (piece.formats ?? '')
    .split(',')
    .map((format) => format.trim().toLowerCase())
    .filter(Boolean);
}

function saisieFromApi(type: ApiTypeDossier, pieces: readonly ApiPieceAttendue[]): TypeSaisie {
  const fichier = pieces.find((piece) => formatsOf(piece).length);
  return {
    numeroClient: type.numeroClientRequis ?? true,
    comptes: type.comptes?.length ? type.comptes : ['AUTRE'],
    fichier: fichier
      ? {
          libelle: fichier.libelle,
          formats: formatsOf(fichier),
          tailleMaxKo: fichier.tailleMaxKo ?? null,
          obligatoire: fichier.obligatoire,
        }
      : null,
  };
}

function fieldOf(champ: ApiChamp): TypeField {
  const unit = champ.unite === 'FCFA' || champ.unite === 'mois' ? champ.unite : undefined;
  return {
    key: champ.code,
    label: champ.libelle,
    kind:
      champ.typeDonnee === 'NOMBRE'
        ? 'number'
        : champ.typeDonnee === 'DATE'
          ? 'date'
          : champ.typeDonnee === 'LISTE'
            ? 'select'
            : 'text',
    options:
      champ.typeDonnee === 'LISTE' ? champ.valeurs.map((valeur) => valeur.libelle) : undefined,
    placeholder: champ.aide ?? undefined,
    optional: !champ.obligatoire,
    // L'API accepte tout nombre positif ou nul.
    zeroOk: champ.typeDonnee === 'NOMBRE' ? true : undefined,
    unit,
    enTete: champ.enTete || undefined,
  };
}
