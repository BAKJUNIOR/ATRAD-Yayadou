import { Status } from '../../../shared/models/status';
import { DossierType } from './dossier-catalog';
import { ApiTransition, statusCodeOf, statusOf } from './entities/dossier-api.entity';
import { RoutedDossier } from './entities/dossier.entity';
import { referentiel } from './referentiel';

export const ATTENTE_DOCS: Status = 'En attente de document(s) complémentaire(s)';

export const LOCKED_STATUSES: readonly Status[] = [
  'Clôturé',
  'Dossier retourné',
  'Rejeté',
  'Traité',
  'Retourné en agence',
];

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

function apiTransitions(dossier: { type: DossierType; status: Status }): ApiTransition[] | null {
  const { typeCircuits, workflows } = referentiel();
  const transitions = workflows[typeCircuits[dossier.type] ?? ''];
  if (!transitions?.length) {
    return null;
  }
  const source = statusCodeOf(dossier.status);
  return transitions.filter((transition) => transition.source === source);
}

export function nextStatuses(dossier: { type: DossierType; status: Status }): readonly Status[] {
  const transitions = apiTransitions(dossier);
  if (transitions) {
    return [...new Set(transitions.map((transition) => statusOf(transition.cible)))];
  }
  const circuit = dossier.type === 'Réclamation' ? RECLAMATION_CIRCUIT : STANDARD_CIRCUIT;
  return circuit[dossier.status] ?? [];
}

export function actionCodeTo(
  dossier: { type: DossierType; status: Status },
  target: Status,
): string {
  const cible = statusCodeOf(target);
  return (
    apiTransitions(dossier)?.find((transition) => transition.cible === cible)?.actionCode ?? ''
  );
}

export function isLocked(dossier: { status: Status }): boolean {
  return LOCKED_STATUSES.includes(dossier.status);
}

export type DossierAction =
  | { kind: 'statut'; target: Status }
  | { kind: 'valider' }
  | { kind: 'cloturer' }
  | { kind: 'retour_noneligible'; reason: string }
  | { kind: 'rejet_info'; docs: string[]; note: string }
  | { kind: 'retour_docs'; reason: string };

export type DossierActionKind = DossierAction['kind'];

export const STATUS_ACTIONS: Partial<Record<Status, { kind: DossierActionKind; label: string }>> = {
  'En cours': { kind: 'statut', label: 'Reprendre le traitement (En cours)' },
  Projeté: { kind: 'statut', label: 'Passer en « Projeté »' },
  [ATTENTE_DOCS]: { kind: 'rejet_info', label: 'Demander des documents complémentaires' },
  Validé: { kind: 'valider', label: 'Valider' },
  Traité: { kind: 'statut', label: 'Marquer comme « Traité »' },
  Clôturé: { kind: 'cloturer', label: 'Clôturer' },
  'Dossier retourné': { kind: 'retour_noneligible', label: 'Retourner (non-éligibilité)' },
};

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

export const DOC_DELAI_JOURS = 7;

export function lockReason(dossier: Pick<RoutedDossier, 'status'>): string {
  switch (dossier.status) {
    case 'Traité':
      return 'dossier traité, non modifiable';
    case 'Clôturé':
      return 'dossier clôturé, non modifiable';
    case 'Dossier retourné':
    case 'Rejeté':
      return "dossier renvoyé vers l'entité réceptrice";
    case 'Validé':
      return 'dossier déjà validé';
    default:
      return 'action impossible';
  }
}
