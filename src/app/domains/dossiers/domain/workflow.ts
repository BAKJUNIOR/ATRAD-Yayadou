import { Status } from '../../../shared/models/status';
import { DossierType } from './dossier-catalog';
import { RoutedDossier } from './entities/dossier.entity';

export const ATTENTE_DOCS: Status = 'En attente de document(s) complémentaire(s)';

/** Statuts après lesquels un dossier n'est plus modifiable par l'entité. */
export const LOCKED_STATUSES: readonly Status[] = [
  'Clôturé',
  'Dossier retourné',
  'Rejeté',
  'Traité',
  'Retourné en agence',
];

/** Statuts finaux d'un circuit. */
export const FINAL_STATUSES: readonly Status[] = [
  'Traité',
  'Clôturé',
  'Dossier retourné',
  'Rejeté',
];

type Circuit = Partial<Record<Status, readonly Status[]>>;

const STANDARD_CIRCUIT: Circuit = {
  Reçu: ['En cours', 'Validé', ATTENTE_DOCS, 'Dossier retourné'],
  'En cours': ['Validé', ATTENTE_DOCS, 'Dossier retourné'],
  [ATTENTE_DOCS]: ['En cours', 'Validé', 'Dossier retourné'],
  Validé: ['Clôturé'],
};

const RECLAMATION_CIRCUIT: Circuit = {
  Reçu: ['En cours', 'Dossier retourné'],
  'En cours': ['Projeté', 'Traité'],
  Projeté: ['Traité', 'En cours'],
  [ATTENTE_DOCS]: ['En cours', 'Dossier retourné'],
};

/** Statuts autorisés à la suite du statut courant, selon le circuit du type de dossier. */
export function nextStatuses(dossier: { type: DossierType; status: Status }): readonly Status[] {
  const circuit = dossier.type === 'Réclamation' ? RECLAMATION_CIRCUIT : STANDARD_CIRCUIT;
  return circuit[dossier.status] ?? [];
}

export function isLocked(dossier: { status: Status }): boolean {
  return LOCKED_STATUSES.includes(dossier.status);
}

/** Actions de traitement qu'une entité peut appliquer à un dossier. */
export type DossierAction =
  | { kind: 'statut'; target: Status }
  | { kind: 'valider' }
  | { kind: 'cloturer' }
  | { kind: 'retour_noneligible'; reason: string }
  | { kind: 'rejet_info'; docs: string[]; note: string }
  | { kind: 'retour_docs'; reason: string };

export type DossierActionKind = DossierAction['kind'];

/** Action qui mène à un statut donné, et son libellé dans les menus. */
export const STATUS_ACTIONS: Partial<Record<Status, { kind: DossierActionKind; label: string }>> = {
  'En cours': { kind: 'statut', label: 'Reprendre le traitement (En cours)' },
  Projeté: { kind: 'statut', label: 'Passer en « Projeté »' },
  [ATTENTE_DOCS]: { kind: 'rejet_info', label: 'Demander des documents complémentaires' },
  Validé: { kind: 'valider', label: 'Valider' },
  Traité: { kind: 'statut', label: 'Marquer comme « Traité »' },
  Clôturé: { kind: 'cloturer', label: 'Clôturer' },
  'Dossier retourné': { kind: 'retour_noneligible', label: 'Retourner (non-éligibilité)' },
};

/** Statut visé par une action. */
export function targetOf(action: DossierAction): Status {
  switch (action.kind) {
    case 'statut':
      return action.target;
    case 'valider':
      return 'Validé';
    case 'cloturer':
      return 'Clôturé';
    case 'rejet_info':
      return ATTENTE_DOCS;
    default:
      return 'Dossier retourné';
  }
}

/** Pièces attendues par type de dossier, proposées lors d'une demande de documents. */
export const PIECES_PAR_TYPE: Record<DossierType, readonly string[]> = {
  'Ouverture de compte': [
    "Pièce d'identité",
    'Justificatif de domicile',
    "Photo d'identité",
    "Formulaire d'ouverture signé",
  ],
  'Demande de prêt': [
    "Pièce d'identité",
    'Bulletins de salaire (3 derniers mois)',
    'Relevés bancaires',
    'Attestation de travail',
  ],
  Réclamation: [
    'Formulaire de réclamation signé',
    "Justificatif de l'opération",
    'Relevé de compte',
  ],
  'Mise à jour KYC': [
    "Pièce d'identité en cours de validité",
    'Justificatif de domicile récent',
    'Fiche KYC signée',
  ],
  'Clôture de compte': [
    'Lettre de demande de clôture signée',
    "Pièce d'identité",
    'RIB du compte de destination',
  ],
};

/** Délai, en jours, accordé à l'agence pour fournir des documents complémentaires. */
export const DOC_DELAI_JOURS = 7;

/** Pourquoi un dossier ne peut plus recevoir d'action. */
export function lockReason(dossier: Pick<RoutedDossier, 'status'>): string {
  switch (dossier.status) {
    case 'Traité':
      return 'dossier traité, non modifiable';
    case 'Clôturé':
      return 'dossier clôturé, non modifiable';
    case 'Dossier retourné':
    case 'Rejeté':
      return "dossier renvoyé vers l'Accueil";
    case 'Validé':
      return 'dossier déjà validé';
    default:
      return 'action impossible';
  }
}
