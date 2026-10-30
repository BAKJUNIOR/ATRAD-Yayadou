import { Entite, EtatType } from '../datasets';
import { DossierType, ProduitOption, TypeField } from '../dossier-catalog';
import { Circuit, SaisieMode } from '../referentiel';

/** Entité de l'organisation, telle que renvoyée par l'API (`entites.base`). */
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

/** Type d'état de transmission (`typesEtat.base`) : une réceptrice, des émettrices autorisées. */
export interface ApiTypeEtat {
  id: string;
  code: string;
  nom: string;
  entiteReceptriceId: string;
  emettriceIds: string[];
  actif: boolean;
}

/** Type de dossier et son circuit (`typesDossier.base`) ; `rattache` faux : type pas encore saisissable. */
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
}

export type ApiTypeDonnee = 'TEXTE' | 'NOMBRE' | 'DATE' | 'LISTE' | 'EMAIL' | 'BOOLEEN';

/** Champ du formulaire d'un type de dossier ; `valeurs` remplie pour une liste. */
export interface ApiChamp {
  code: string;
  libelle: string;
  typeDonnee: ApiTypeDonnee;
  obligatoire: boolean;
  unite: string | null;
  motifRegex: string | null;
  aide: string | null;
  valeurs: { code: string; libelle: string }[];
}

/** Formulaire de saisie d'un type de dossier (`typesDossier.formulaire`). */
export interface ApiFormulaire {
  typeDossier: ApiTypeDossier;
  champs: ApiChamp[];
  pieces: { libelle: string; obligatoire: boolean }[];
  /** Produits (opérations) proposés pour ce type, dans l'ordre. */
  operations: ApiOperation[];
}

/** Opération, présentée à la saisie comme « produit ». */
export interface ApiOperation {
  id: string;
  code: string;
  libelle: string;
}

/** Paramétrage lu dans l'API, avant sa conversion vers le référentiel du front. */
export interface ApiParametrage {
  entites: ApiEntite[];
  typesEtat: ApiTypeEtat[];
  typesDossier: ApiTypeDossier[];
  modeSaisie: 'CHOIX' | 'AUTO';
  formulaires: ApiFormulaire[];
  motifsRetour: ApiMotif[];
}

/** Ce que l'API fournit au référentiel du front (le vocabulaire vient de la marque). */
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
  /** Motifs de retour (non-éligibilité), pour afficher ceux d'un dossier retourné. */
  motifsRetour: MotifOption[];
}

/** Motif proposé (retour, rejet), avec son identifiant dans l'API. */
export interface MotifOption {
  id: string;
  label: string;
}

/** Motif tel que renvoyé par l'API (`motifs.base`). */
export interface ApiMotif {
  id: string;
  parentId: string | null;
  libelle: string;
}

/**
 * Référentiel du front à partir du paramétrage de l'API. Le front désigne les entités par leur code et les types
 * de dossier par leur nom ; les identifiants de l'API sont gardés (`id`, `typeIds`) pour les appels suivants.
 * Seuls les types d'état et types de dossier actifs sont repris.
 */
export function referentielFromApi(api: ApiParametrage): ReferentielApiPart {
  const codeOf = new Map(api.entites.map((entite) => [entite.id, entite.code]));
  const typesDossier = api.typesDossier.filter((type) => type.actif);
  const formulaireOf = new Map(api.formulaires.map((formulaire) => [formulaire.typeDossier.id, formulaire]));
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
        emet: type.emettriceIds.map((id) => codeOf.get(id)).filter((code): code is string => !!code),
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
    typePieces: parType((type) => (formulaireOf.get(type.id)?.pieces ?? []).map((piece) => piece.libelle)),
    motifsRetour: api.motifsRetour.map((motif) => ({ id: motif.id, label: motif.libelle })),
    typeOperations: parType((type) =>
      (formulaireOf.get(type.id)?.operations ?? []).map((operation) => ({ id: operation.id, label: operation.libelle })),
    ),
  };
}

/** Champ du formulaire de saisie ; une liste propose les libellés, que l'API accepte autant que les codes. */
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
    options: champ.typeDonnee === 'LISTE' ? champ.valeurs.map((valeur) => valeur.libelle) : undefined,
    placeholder: champ.aide ?? undefined,
    optional: !champ.obligatoire,
    // L'API accepte tout nombre positif ou nul.
    zeroOk: champ.typeDonnee === 'NOMBRE' ? true : undefined,
    unit,
  };
}
