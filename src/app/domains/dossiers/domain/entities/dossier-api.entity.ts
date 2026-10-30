import { Status } from '../../../../shared/models/status';
import { TimelineTone } from '../../../../shared/ui/timeline/timeline.component';
import {
  DossierType,
  Priorite,
  displayValue,
  fieldsOf,
  operationIdOf,
  produitLabelOf,
} from '../dossier-catalog';
import { entiteByCode, entites, labelOf, referentiel } from '../referentiel';
import {
  Dossier,
  DossierData,
  DossierLog,
  EtatDossier,
  PieceJointe,
  RoutedDossier,
} from './dossier.entity';
import { Etat } from './etat.entity';

// ------------------------------------------------------------------ Réponses de l'API

export type ApiPriorite = 'NORMALE' | 'HAUTE' | 'URGENTE';
export type ApiRoleCompte = 'COMPTE_CHEQUE' | 'COMPTE_PRODUIT' | 'AUTRE';

/** Compte lié à un dossier. */
export interface ApiCompte {
  role: ApiRoleCompte;
  numero: string;
  cle: string | null;
  intitule: string | null;
}

/** Dossier tel que renvoyé par l'API ; `statut` est un code (`TEMPORAIRE`, `EN_COURS`...). */
export interface ApiDossier {
  id: string;
  reference: string;
  typeDossierId: string;
  operationId: string | null;
  entiteEmettriceId: string;
  etatOrigineId: string | null;
  entiteTraitementId: string | null;
  statut: string;
  priorite: ApiPriorite;
  echeance: string | null;
  tiersNom: string | null;
  tiersPrenom: string | null;
  tiersNumero: string | null;
  objet: string | null;
  montant: number | null;
  donnees: Record<string, unknown>;
  note: string | null;
  comptes: ApiCompte[];
  affecteAId: string | null;
  affecteLe: string | null;
  creeLe: string;
  modifieLe: string | null;
}

/** Pièce jointe d'un dossier (le contenu se télécharge à part). */
export interface ApiPieceJointe {
  id: string;
  nomFichier: string;
  typeMime: string;
  tailleOctets: number;
  ajouteLe: string;
  ajouteParId: string | null;
  ajoutePar: string | null;
}

export type ApiStatutReception = 'EN_ATTENTE' | 'RECU' | 'NON_RECU';

/** Dossier d'un état, tel qu'il figure sur le bordereau et au pointage. */
export interface ApiLigneEtat {
  dossierId: string;
  reference: string;
  typeDossier: string;
  tiersNom: string | null;
  tiersPrenom: string | null;
  tiersNumero: string | null;
  priorite: ApiPriorite;
  statutReception: ApiStatutReception;
  recuLe: string | null;
  /** Dossier complet et ses pièces jointes. */
  dossier: ApiDossier;
  pieces: ApiPieceJointe[];
}

export interface ApiEntiteResume {
  id: string;
  code: string;
  nom: string;
}

/** État de transmission ; `dossiers` est rempli pour le détail et le bordereau. */
export interface ApiEtat {
  id: string;
  reference: string;
  nature: 'INITIAL' | 'AFFECTATION' | 'RETOUR';
  typeEtatId: string | null;
  typeEtatNom: string | null;
  entiteEmettrice: ApiEntiteResume;
  entiteReceptrice: ApiEntiteResume;
  agentEmetteurId: string;
  agentEmetteur: string | null;
  statut: 'TEMPORAIRE' | 'TRANSMIS' | 'RECU_PARTIELLEMENT' | 'RECU';
  transmisLe: string | null;
  recuLe: string | null;
  nombreDossiers: number;
  dossiers: ApiLigneEtat[];
}

/** Corps de création ou de modification d'un dossier du brouillon. */
export interface ApiDossierBrouillon {
  typeDossierId: string;
  operationId: string | null;
  priorite: ApiPriorite;
  tiersNom: string | null;
  tiersPrenom: string | null;
  tiersNumero: string | null;
  montant: number | null;
  donnees: Record<string, string>;
  note: string | null;
  comptes: { role: ApiRoleCompte; numero: string }[];
}

// ------------------------------------------------------------------ Correspondances

const STATUS_OF_CODE: Record<string, Status> = {
  TEMPORAIRE: 'Temporaire',
  TRANSMIS: 'Transmis',
  RECU: 'Reçu',
  RECU_PARTIELLEMENT: 'Reçu partiellement',
  EN_COURS: 'En cours',
  PROJETE: 'Projeté',
  EN_ATTENTE_DOCUMENTS: 'En attente de document(s) complémentaire(s)',
  VALIDE: 'Validé',
  TRAITE: 'Traité',
  CLOTURE: 'Clôturé',
  REJETE: 'Rejeté',
  DOSSIER_RETOURNE: 'Dossier retourné',
  RETOUR_EN_COURS: 'Retour en cours',
  RETOURNE_EN_AGENCE: 'Retourné en agence',
};

const PRIORITE_OF: Record<ApiPriorite, Priorite> = {
  NORMALE: 'Normale',
  HAUTE: 'Haute',
  URGENTE: 'Urgente',
};

/** Code de statut de l'API pour un statut affiché. */
export function statusCodeOf(status: Status): string {
  return Object.entries(STATUS_OF_CODE).find(([, label]) => label === status)?.[0] ?? '';
}

/** Statut affiché pour un code de statut de l'API (dossier ou état). */
export function statusOf(code: string): Status {
  return STATUS_OF_CODE[code] ?? 'En cours';
}

export function prioriteOf(priorite: ApiPriorite): Priorite {
  return PRIORITE_OF[priorite] ?? 'Normale';
}

export function apiPrioriteOf(priorite: Priorite): ApiPriorite {
  return (
    (Object.keys(PRIORITE_OF) as ApiPriorite[]).find((code) => PRIORITE_OF[code] === priorite) ??
    'NORMALE'
  );
}

/** Nom du type de dossier à partir de son identifiant dans l'API. */
export function typeOfId(typeDossierId: string): DossierType {
  return Object.entries(referentiel().typeIds).find(([, id]) => id === typeDossierId)?.[0] ?? '';
}

/** Libellé `Nom (CODE)` d'une entité à partir de son identifiant dans l'API. */
export function entityLabelOfId(entiteId: string | null | undefined): string {
  const entite = entiteId ? entites().find((candidate) => candidate.id === entiteId) : undefined;
  return entite ? labelOf(entite) : '';
}

/** Identifiant dans l'API d'une entité désignée par son code. */
export function entityIdOfCode(code: string): string | null {
  return entiteByCode(code)?.id ?? null;
}

// ------------------------------------------------------------------ Conversions

export function pieceFromApi(piece: ApiPieceJointe, dossierId: string): PieceJointe {
  return {
    id: piece.id,
    dossierId,
    name: piece.nomFichier,
    size: piece.tailleOctets,
    mime: piece.typeMime,
    ext: (piece.nomFichier.split('.').pop() ?? '').toUpperCase().replace('JPEG', 'JPG'),
    at: piece.ajouteLe,
    by: piece.ajoutePar ?? '',
  };
}

/** Dossier du front à partir de celui de l'API : les champs propres au type sont remis en forme pour l'affichage. */
export function dossierFromApi(api: ApiDossier, pieces: readonly ApiPieceJointe[] = []): Dossier {
  const type = typeOfId(api.typeDossierId);
  const xraw = Object.fromEntries(
    Object.entries(api.donnees ?? {}).map(([key, value]) => [key, String(value ?? '')]),
  );
  const fields = fieldsOf(type);
  const prenom = api.tiersPrenom ?? '';
  const nom = api.tiersNom ?? '';
  return {
    id: api.id,
    ref: api.reference,
    createdAt: api.creeLe,
    log: [],
    num: api.tiersNumero ?? '',
    prenom,
    nom,
    compte: api.comptes?.[0]?.numero ?? '',
    client: [prenom, nom].filter(Boolean).join(' ') || 'Client non renseigné',
    type,
    produit: produitLabelOf(type, api.operationId),
    prio: prioriteOf(api.priorite),
    note: api.note ?? '',
    pieces: pieces.map((piece) => pieceFromApi(piece, api.id)),
    extra: fields
      .filter((field) => xraw[field.key])
      .map((field) => ({ label: field.label, value: displayValue(field, xraw[field.key]) })),
    xraw,
    montant:
      api.montant !== null && api.montant !== undefined
        ? displayValue(
            { key: 'montant', label: 'Montant', kind: 'number', unit: 'FCFA' },
            String(api.montant),
          )
        : undefined,
  };
}

/** Corps envoyé à l'API pour un dossier saisi par l'agence ; le n° de compte est rangé avec le rôle « AUTRE ». */
export function brouillonOf(data: DossierData): ApiDossierBrouillon {
  const fields = fieldsOf(data.type);
  const montantField =
    fields.find((field) => field.unit === 'FCFA' && /montant/i.test(field.key)) ??
    fields.find((field) => field.unit === 'FCFA');
  const montant = montantField ? Number(data.xraw[montantField.key]) : NaN;
  return {
    typeDossierId: referentiel().typeIds[data.type] ?? '',
    operationId: operationIdOf(data.type, data.produit),
    priorite: apiPrioriteOf(data.prio),
    tiersNom: data.nom || null,
    tiersPrenom: data.prenom || null,
    tiersNumero: data.num || null,
    montant: Number.isFinite(montant) ? montant : null,
    donnees: { ...data.xraw },
    note: data.note || null,
    comptes: data.compte ? [{ role: 'AUTRE', numero: data.compte }] : [],
  };
}

const LIGNE_STATUS: Record<ApiStatutReception, Status> = {
  EN_ATTENTE: 'Transmis',
  RECU: 'Reçu',
  NON_RECU: 'Non reçu',
};

/** État du front ; ses dossiers (détail, bordereau) gardent leur statut de pointage. */
export function etatFromApi(api: ApiEtat): Etat {
  const dossiers: EtatDossier[] = (api.dossiers ?? []).map((ligne) => {
    const dossier = dossierFromApi(ligne.dossier, ligne.pieces);
    return {
      ...dossier,
      status: LIGNE_STATUS[ligne.statutReception],
      transmisAt: api.transmisLe ?? '',
      rec: ligne.statutReception === 'RECU' ? { at: ligne.recuLe ?? '', by: '' } : undefined,
      nonRec: ligne.statutReception === 'NON_RECU' ? { at: api.recuLe ?? '', by: '' } : undefined,
      entite: entityLabelOfId(ligne.dossier.entiteTraitementId) || undefined,
    };
  });
  const types = [...new Set(dossiers.map((dossier) => dossier.type))];
  return {
    id: api.id,
    ref: api.reference,
    agence: api.entiteEmettrice.nom,
    code: api.entiteEmettrice.code,
    type: types.length > 1 ? `Mixte (${types.length} types)` : (types[0] ?? ''),
    createdAt: api.transmisLe ?? '',
    sentAt: api.transmisLe ?? '',
    status: statusOf(api.statut),
    receivedAt: api.recuLe ?? '',
    emetteur: api.agentEmetteur ?? '',
    etType: api.typeEtatId ?? undefined,
    etTypeNom: api.typeEtatNom ?? undefined,
    recep: api.entiteReceptrice.code,
    dest: labelOf(api.entiteReceptrice),
    dossiers,
    count: api.nombreDossiers,
    prints: [],
  };
}

// ------------------------------------------------------------------ Détail, historique et suivi

export type ApiTypeEvenement =
  | 'CREATION'
  | 'MODIFICATION'
  | 'TRANSMISSION'
  | 'RECEPTION'
  | 'NON_RECEPTION'
  | 'AFFECTATION'
  | 'CHANGEMENT_STATUT'
  | 'RETOUR';

/** Événement de l'historique d'un dossier ; `utilisateur` et `versUtilisateur` : prénom et nom. */
export interface ApiHistorique {
  typeEvenement: ApiTypeEvenement;
  statutSource: string | null;
  statutCible: string | null;
  utilisateurId: string | null;
  utilisateur: string | null;
  versUtilisateurId: string | null;
  versUtilisateur: string | null;
  commentaire: string | null;
  survenuLe: string;
}

/** Documents complémentaires demandés à l'agence ; `regulariseLe` vide : toujours attendus. */
export interface ApiSuspens {
  id: string;
  piecesManquantes: string[];
  note: string | null;
  demandeParId: string;
  demandeLe: string;
  dateLimite: string | null;
  regulariseLe: string | null;
}

/** Retour d'un dossier par le service traitant, puis son renvoi à l'agence par l'entité réceptrice. */
export interface ApiRetour {
  id: string;
  typeRetour: 'NON_ELIGIBLE' | 'ABSENCE_COMPLEMENT' | 'BESOIN_INFORMATION';
  motifIds: string[];
  commentaire: string | null;
  rejeteurId: string;
  rejeteLe: string;
  renvoyeLe: string | null;
  confirmeParId: string | null;
}

/** Passage du circuit autorisé depuis le statut actuel (bouton d'action). */
export interface ApiTransition {
  source: string;
  cible: string;
  actionCode: string;
  libelleAction: string;
  exigeMotif: boolean;
}

/** Détail d'un dossier : actions possibles, documents attendus, dernier retour, pièces et historique. */
export interface ApiDossierDetail {
  dossier: ApiDossier;
  actions: ApiTransition[];
  suspens: ApiSuspens | null;
  retour: ApiRetour | null;
  pieces: ApiPieceJointe[];
  historique: ApiHistorique[];
}

/** Ligne des écrans de suivi (agence, entité de traitement, accueil). */
export interface ApiDossierSuivi {
  id: string;
  reference: string;
  client: string;
  tiersNumero: string | null;
  typeDossier: string;
  agence: string | null;
  etatReference: string | null;
  statut: string;
  statutLibelle: string;
  etape: ApiEtapeSuivi | null;
  priorite: ApiPriorite;
  echeance: string | null;
  joursDeRetard: number | null;
  gestionnaireId: string | null;
  gestionnaire: string | null;
  creeLe: string;
  recuLe: string | null;
  etatId: string | null;
  numeroCompte: string | null;
}

export type ApiEtapeSuivi =
  | 'TRANSMIS'
  | 'NON_RECU'
  | 'EN_COURS'
  | 'A_COMPLETER'
  | 'DOSSIER_RETOURNE'
  | 'RETOURNE_EN_AGENCE'
  | 'VALIDE'
  | 'CLOTURE';

const STATUS_OF_ETAPE: Record<ApiEtapeSuivi, Status> = {
  TRANSMIS: 'Transmis',
  NON_RECU: 'Non reçu',
  EN_COURS: 'En cours',
  A_COMPLETER: 'En attente de document(s) complémentaire(s)',
  DOSSIER_RETOURNE: 'Dossier retourné',
  RETOURNE_EN_AGENCE: 'Retourné en agence',
  VALIDE: 'Validé',
  CLOTURE: 'Clôturé',
};

/** Statut montré à l'agence pour une étape de son suivi. */
export function statusOfEtape(etape: ApiEtapeSuivi | null): Status {
  return etape ? STATUS_OF_ETAPE[etape] : 'En cours';
}

/**
 * Statut vu par l'agence (mêmes règles que l'étape du suivi côté API) : les étapes internes au traitement
 * deviennent « En cours », Traité compte comme Validé.
 */
export function agencyStatusOf(code: string, nonRecu: boolean): Status {
  switch (code) {
    case 'TRANSMIS':
      return nonRecu ? 'Non reçu' : 'Transmis';
    case 'EN_ATTENTE_DOCUMENTS':
      return 'En attente de document(s) complémentaire(s)';
    case 'DOSSIER_RETOURNE':
    case 'RETOUR_EN_COURS':
    case 'REJETE':
      return 'Dossier retourné';
    case 'RETOURNE_EN_AGENCE':
      return 'Retourné en agence';
    case 'VALIDE':
    case 'TRAITE':
      return 'Validé';
    case 'CLOTURE':
      return 'Clôturé';
    default:
      return 'En cours';
  }
}

const TONE_OF_EVENT: Record<ApiTypeEvenement, TimelineTone> = {
  CREATION: 'neutral',
  MODIFICATION: 'warning',
  TRANSMISSION: 'info',
  RECEPTION: 'brand',
  NON_RECEPTION: 'danger',
  AFFECTATION: 'info',
  CHANGEMENT_STATUT: 'info',
  RETOUR: 'danger',
};

const FINAL_OK = ['VALIDE', 'TRAITE', 'CLOTURE'];

/** Historique de l'API en lignes de frise, du plus ancien au plus récent. */
export function logsFromApi(historique: readonly ApiHistorique[]): DossierLog[] {
  return historique.map((evenement) => {
    const cible = evenement.statutCible ? statusOf(evenement.statutCible) : '';
    let label: string;
    switch (evenement.typeEvenement) {
      case 'CREATION':
        label = evenement.commentaire || 'Dossier créé';
        break;
      case 'TRANSMISSION':
        label = evenement.commentaire || 'Dossier transmis';
        break;
      case 'AFFECTATION':
        label =
          evenement.commentaire ||
          (evenement.versUtilisateur ? `Attribué à ${evenement.versUtilisateur}` : 'Affectation');
        break;
      case 'CHANGEMENT_STATUT':
        label = `Statut : ${cible}${evenement.commentaire ? ` — ${evenement.commentaire}` : ''}`;
        break;
      default:
        label = evenement.commentaire || cible || evenement.typeEvenement;
    }
    const tone =
      evenement.typeEvenement === 'CHANGEMENT_STATUT' &&
      FINAL_OK.includes(evenement.statutCible ?? '')
        ? 'success'
        : TONE_OF_EVENT[evenement.typeEvenement];
    return {
      at: evenement.survenuLe,
      who: evenement.utilisateur ?? '',
      label,
      tone,
      pre: evenement.typeEvenement === 'CREATION' || evenement.typeEvenement === 'MODIFICATION',
    };
  });
}

/** Motifs de retour d'un dossier, en libellés, suivis du commentaire. */
export function retourReason(retour: ApiRetour | null): string {
  if (!retour) {
    return '';
  }
  const motifs = retour.motifIds
    .map((id) => referentiel().motifsRetour.find((motif) => motif.id === id)?.label)
    .filter((label): label is string => !!label);
  return [...motifs, retour.commentaire ?? ''].filter(Boolean).join(' — ');
}

/**
 * Dossier routé (reçu puis suivi par une entité de traitement) à partir du détail de l'API. `etatRef` : référence
 * de son état d'origine, quand elle est connue.
 */
export function routedFromApi(detail: ApiDossierDetail, etatRef = ''): RoutedDossier {
  const { dossier: api, suspens, retour } = detail;
  const logs = logsFromApi(detail.historique);
  const reception = detail.historique.find((evenement) => evenement.typeEvenement === 'RECEPTION');
  const attribution = [...detail.historique]
    .reverse()
    .find(
      (evenement) => evenement.versUtilisateurId && evenement.versUtilisateurId === api.affecteAId,
    );
  return {
    ...dossierFromApi(api, detail.pieces),
    log: logs,
    status: statusOf(api.statut),
    agence: entityLabelOfId(api.entiteEmettriceId),
    etat: etatRef,
    entite: entityLabelOfId(api.entiteTraitementId),
    affecte: reception?.survenuLe ?? '',
    affectedBy: reception?.utilisateur ?? '',
    echeanceIso: api.echeance ?? '',
    delai: '',
    gest: attribution?.versUtilisateur ?? '',
    gestId: api.affecteAId ?? undefined,
    gestAt: api.affecteLe ?? '',
    docsMissing: suspens?.piecesManquantes,
    docsReqAt: suspens?.demandeLe,
    docsDeadlineIso: suspens?.dateLimite ?? undefined,
    docsNote: suspens?.note ?? undefined,
    rejectedAt: retour?.rejeteLe,
    rejectReason: retourReason(retour) || undefined,
    docsRetAt: retour?.typeRetour === 'ABSENCE_COMPLEMENT' ? retour.rejeteLe : undefined,
    renvoyeAt: retour?.renvoyeLe ?? undefined,
  };
}
