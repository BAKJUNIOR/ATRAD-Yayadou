import { isoDateToFr } from '../../../core/utils/date.util';
import { Status } from '../../../shared/models/status';
import { DossierType } from '../../dossiers/domain/dossier-catalog';
import { RoutedDossier } from '../../dossiers/domain/entities/dossier.entity';
import { ATTENTE_DOCS, isLocked } from '../../dossiers/domain/workflow';

const DAY_MS = 86_400_000;

function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  return Math.round((Date.parse(toIsoDate) - Date.parse(fromIsoDate)) / DAY_MS);
}

/**
 * Jours restants avant l'échéance (négatif = retard). Pour un dossier validé ou clôturé, le
 * calcul s'arrête à la date de fin de traitement.
 */
export function daysLeft(dossier: RoutedDossier, todayIso: string): number {
  const done = dossier.status === 'Validé' || dossier.status === 'Clôturé';
  const end = done ? (dossier.closedAt || dossier.validatedAt || '').slice(0, 10) : '';
  return daysBetween(end || todayIso, dossier.echeanceIso);
}

export function isLate(dossier: RoutedDossier, todayIso: string): boolean {
  const out: readonly Status[] = ['Clôturé', 'Validé', 'Dossier retourné', 'Rejeté'];
  return !out.includes(dossier.status) && daysLeft(dossier, todayIso) < 0;
}

export type DelayTone = 'danger' | 'warning' | 'success' | 'muted';

export interface DelayLabel {
  label: string;
  tone: DelayTone;
  /** Le délai de fourniture des documents complémentaires est dépassé. */
  docsLate?: boolean;
}

/** Situation d'un dossier par rapport à son échéance. */
export function delayOf(dossier: RoutedDossier, todayIso: string): DelayLabel {
  if (dossier.status === ATTENTE_DOCS && dossier.docsDeadlineIso) {
    const deadline = isoDateToFr(dossier.docsDeadlineIso);
    return todayIso > dossier.docsDeadlineIso
      ? { label: `Délai dépassé (${deadline})`, tone: 'danger', docsLate: true }
      : { label: `Docs avant le ${deadline}`, tone: 'warning' };
  }
  if (dossier.status === 'Dossier retourné' || dossier.status === 'Rejeté') {
    return { label: "Sorti de l'entité", tone: 'muted' };
  }
  const days = daysLeft(dossier, todayIso);
  if (dossier.status === 'Validé' || dossier.status === 'Clôturé') {
    return days >= 0
      ? { label: 'Traité dans les délais', tone: 'success' }
      : { label: `Traité avec ${Math.abs(days)} j de retard`, tone: 'danger' };
  }
  if (days < 0) {
    return { label: `Retard de ${Math.abs(days)} j`, tone: 'danger' };
  }
  if (days === 0) {
    return { label: "Échéance aujourd'hui", tone: 'warning' };
  }
  return days === 1
    ? { label: 'Dans 1 jour', tone: 'warning' }
    : { label: `Dans ${days} jours`, tone: 'success' };
}

/** Filtre rapide du portefeuille : un statut, les dossiers en retard, ou tout. */
export type PortfolioFilter = Status | 'late' | null;

export const PORTFOLIO_FILTERS: readonly { filter: PortfolioFilter; label: string }[] = [
  { filter: null, label: 'Tous les dossiers' },
  { filter: 'Reçu', label: 'Reçu' },
  { filter: 'En cours', label: 'En cours' },
  { filter: 'Projeté', label: 'Projeté' },
  { filter: 'late', label: 'En retard' },
  { filter: ATTENTE_DOCS, label: 'À compléter' },
  { filter: 'Validé', label: 'Validé' },
  { filter: 'Traité', label: 'Traité' },
  { filter: 'Clôturé', label: 'Clôturé' },
];

export function matchesFilter(
  dossier: RoutedDossier,
  filter: PortfolioFilter,
  todayIso: string,
): boolean {
  if (filter === null) {
    return true;
  }
  return filter === 'late' ? isLate(dossier, todayIso) : dossier.status === filter;
}

export interface PortfolioCriteria {
  num: string;
  nom: string;
  compte: string;
  ref: string;
  type: DossierType | '';
}

export const EMPTY_PORTFOLIO_CRITERIA: PortfolioCriteria = {
  num: '',
  nom: '',
  compte: '',
  ref: '',
  type: '',
};

export function hasCriteria(criteria: PortfolioCriteria): boolean {
  return Object.values(criteria).some((value) => value.trim());
}

export function matchesCriteria(dossier: RoutedDossier, criteria: PortfolioCriteria): boolean {
  const has = (value: string, query: string): boolean =>
    value.toLowerCase().includes(query.trim().toLowerCase());
  return (
    has(dossier.num, criteria.num) &&
    has([dossier.prenom, dossier.nom, dossier.client].join(' '), criteria.nom) &&
    has(dossier.compte, criteria.compte) &&
    has(dossier.ref, criteria.ref) &&
    (!criteria.type || dossier.type === criteria.type)
  );
}

/** Dossiers d'une entité qui attendent un gestionnaire. */
export function unassigned(dossiers: readonly RoutedDossier[]): RoutedDossier[] {
  return dossiers.filter((dossier) => !dossier.gest && !isLocked(dossier));
}
