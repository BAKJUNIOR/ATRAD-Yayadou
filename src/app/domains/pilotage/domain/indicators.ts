import { isoDateToFr, toIsoDate } from '../../../core/utils/date.util';
import { STATUS_KEYS, Status } from '../../../shared/models/status';
import { DOSSIER_TYPES, DossierType } from '../../dossiers/domain/dossier-catalog';
import { RoutedDossier } from '../../dossiers/domain/entities/dossier.entity';
import { Etat } from '../../dossiers/domain/entities/etat.entity';
import { daysLeft, isLate } from '../../traitement/domain/portfolio';

const DAY_MS = 86_400_000;

/** Objectif de respect des délais, en pourcentage. */
export const SLA_TARGET = 90;

export function isTreated(dossier: RoutedDossier): boolean {
  return dossier.status === 'Validé' || dossier.status === 'Clôturé';
}

function isOngoing(dossier: RoutedDossier): boolean {
  return dossier.status === 'En cours' || dossier.status === 'Reçu';
}

function percent(part: number, total: number): number {
  return total ? Math.round((part * 100) / total) : 0;
}

/** Jours écoulés entre le routage et la fin de traitement (ou aujourd'hui). */
function daysToTreat(dossier: RoutedDossier, todayIso: string): number {
  const end = (dossier.closedAt || dossier.validatedAt || '').slice(0, 10) || todayIso;
  const start = toIsoDate(new Date(dossier.affecte));
  return Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS));
}

/** `2,4 j`, ou `—` si aucun dossier n'est traité. */
function averageDelay(treated: readonly RoutedDossier[], todayIso: string): string {
  if (!treated.length) {
    return '—';
  }
  const total = treated.reduce((sum, dossier) => sum + daysToTreat(dossier, todayIso), 0);
  return `${(total / treated.length).toFixed(1).replace('.', ',')} j`;
}

/** Part des dossiers traités qui l'ont été dans les délais. */
export function sla(dossiers: readonly RoutedDossier[], todayIso: string) {
  const treated = dossiers.filter(isTreated);
  const onTime = treated.filter((dossier) => daysLeft(dossier, todayIso) >= 0);
  return { treated, onTime, rate: percent(onTime.length, treated.length) };
}

/** Couleur d'un taux de respect des délais. */
export function slaTone(rate: number): 'success' | 'warning' | 'danger' {
  if (rate >= SLA_TARGET) {
    return 'success';
  }
  return rate >= 70 ? 'warning' : 'danger';
}

export type PeriodId = 'week' | 'previous-week' | 'month' | 'all';

export interface Period {
  id: PeriodId;
  label: string;
  /** Bornes incluses (`yyyy-MM-dd`) ; absentes pour « tout l'historique ». */
  from?: string;
  to?: string;
}

/** Périodes proposées dans le tableau de bord, relatives à la date du jour. */
export function periods(todayIso: string): Period[] {
  const today = new Date(`${todayIso}T00:00:00`);
  const shift = (date: Date, days: number): Date => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  };
  const short = (date: Date): string => isoDateToFr(toIsoDate(date)).slice(0, 5);
  const weekStart = shift(today, -((today.getDay() + 6) % 7));
  const previousStart = shift(weekStart, -7);
  const previousEnd = shift(weekStart, -1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const month = today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return [
    {
      id: 'week',
      label: `Semaine en cours (${short(weekStart)} – ${short(today)})`,
      from: toIsoDate(weekStart),
    },
    {
      id: 'previous-week',
      label: `Semaine précédente (${short(previousStart)} – ${short(previousEnd)})`,
      from: toIsoDate(previousStart),
      to: toIsoDate(previousEnd),
    },
    {
      id: 'month',
      label: `Mois en cours (${month})`,
      from: toIsoDate(monthStart),
      to: toIsoDate(monthEnd),
    },
    { id: 'all', label: "Tout l'historique" },
  ];
}

export interface DashboardScope {
  agence: string;
  type: DossierType | '';
  period: Period;
}

/** Dossiers routés compris dans le périmètre du tableau de bord. */
export function inScope(
  dossiers: readonly RoutedDossier[],
  scope: DashboardScope,
): RoutedDossier[] {
  return dossiers.filter((dossier) => {
    const routedOn = toIsoDate(new Date(dossier.affecte));
    return (
      (!scope.agence || dossier.agence === scope.agence) &&
      (!scope.type || dossier.type === scope.type) &&
      (!scope.period.from || routedOn >= scope.period.from) &&
      (!scope.period.to || routedOn <= scope.period.to)
    );
  });
}

export interface KpiCard {
  label: string;
  value: string;
  hint: string;
  tone: 'success' | 'warning' | 'danger';
  bar: number;
}

export function kpiCards(
  scoped: readonly RoutedDossier[],
  etats: readonly Etat[],
  scope: DashboardScope,
  todayIso: string,
): KpiCard[] {
  const { treated, onTime, rate } = sla(scoped, todayIso);
  const ongoing = scoped.filter(isOngoing);
  const late = scoped.filter((dossier) => isLate(dossier, todayIso));
  const total = scoped.length;

  const scopedEtats = etats.filter(
    (etat) => !scope.agence || `${etat.agence} (${etat.code})` === scope.agence,
  );
  const sent = scopedEtats.flatMap((etat) => etat.dossiers);
  const notReceived = sent.filter(
    (dossier) => dossier.nonRec && !dossier.rec && (!scope.type || dossier.type === scope.type),
  );
  const partial = scopedEtats.filter((etat) => etat.status === 'Reçu partiellement').length;

  return [
    {
      label: 'Dossiers traités',
      value: String(treated.length),
      hint: 'validés ou clôturés',
      tone: 'success',
      bar: percent(treated.length, total),
    },
    {
      label: 'En cours',
      value: String(ongoing.length),
      hint: 'en instruction ou à prendre en charge',
      tone: 'warning',
      bar: percent(ongoing.length, total),
    },
    {
      label: 'En retard',
      value: String(late.length),
      hint: 'délai dépassé',
      tone: 'danger',
      bar: percent(late.length, total),
    },
    {
      label: "Non reçus à l'Accueil",
      value: String(notReceived.length),
      hint: `${partial} état(s) reçu(s) partiellement`,
      tone: 'warning',
      bar: percent(notReceived.length, sent.length),
    },
    {
      label: 'Respect des délais',
      value: `${rate} %`,
      hint: `${onTime.length} traités dans les délais sur ${treated.length}`,
      tone: rate >= SLA_TARGET ? 'success' : 'warning',
      bar: rate,
    },
  ];
}

const BREAKDOWN_STATUSES: readonly Status[] = ['Reçu', 'En cours', 'Validé', 'Clôturé', 'Rejeté'];

/** Répartition des dossiers par statut, statuts vides exclus. */
export function byStatus(scoped: readonly RoutedDossier[]) {
  return BREAKDOWN_STATUSES.map((status) => {
    const count = scoped.filter((dossier) => dossier.status === status).length;
    return {
      label: status,
      count,
      share: percent(count, scoped.length),
      modifier: `status-${STATUS_KEYS[status]}`,
    };
  }).filter((entry) => entry.count > 0);
}

/** Volume par type de dossier, rapporté au type le plus fréquent. */
export function byType(scoped: readonly RoutedDossier[]) {
  const counts = DOSSIER_TYPES.map((type) => ({
    label: type,
    count: scoped.filter((dossier) => dossier.type === type).length,
  }));
  const max = Math.max(1, ...counts.map((entry) => entry.count));
  return counts
    .filter((entry) => entry.count > 0)
    .map((entry) => ({ ...entry, share: percent(entry.count, max) }));
}

export function averageTreatmentDelay(scoped: readonly RoutedDossier[], todayIso: string): string {
  return averageDelay(scoped.filter(isTreated), todayIso);
}

function agencesOf(dossiers: readonly RoutedDossier[]): string[] {
  return [...new Set(dossiers.map((dossier) => dossier.agence))];
}

export interface AgencePerformance {
  agence: string;
  total: number;
  ongoing: number;
  late: number;
  /** Taux de respect des délais ; `null` si aucun dossier n'est encore traité. */
  rate: number | null;
  tone: 'success' | 'warning' | 'danger';
}

/** Performance de chaque agence d'origine sur un ensemble de dossiers. */
export function agencePerformance(
  dossiers: readonly RoutedDossier[],
  todayIso: string,
): AgencePerformance[] {
  return agencesOf(dossiers).map((agence) => {
    const rows = dossiers.filter((dossier) => dossier.agence === agence);
    const result = sla(rows, todayIso);
    return {
      agence,
      total: rows.length,
      ongoing: rows.filter(isOngoing).length,
      late: rows.filter((dossier) => isLate(dossier, todayIso)).length,
      rate: result.treated.length ? result.rate : null,
      tone: slaTone(result.rate),
    };
  });
}

/** Dossiers en retard, du plus critique au moins critique. */
export function lateDossiers(dossiers: readonly RoutedDossier[], todayIso: string) {
  return dossiers
    .filter((dossier) => isLate(dossier, todayIso))
    .map((dossier) => ({ dossier, days: Math.abs(daysLeft(dossier, todayIso)) }))
    .sort((a, b) => b.days - a.days);
}

/**
 * Classement des agences, de la moins respectueuse des délais à la plus respectueuse.
 * Une agence sans dossier traité est créditée de 100 %.
 */
export function agenceRanking(dossiers: readonly RoutedDossier[], todayIso: string) {
  return agencePerformance(dossiers, todayIso)
    .map((entry) => ({ ...entry, rate: entry.rate ?? 100, tone: slaTone(entry.rate ?? 100) }))
    .sort((a, b) => a.rate - b.rate)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/** Comparatif des agences, par taux de dossiers en retard décroissant. */
export function agenceComparison(dossiers: readonly RoutedDossier[], todayIso: string) {
  return agencesOf(dossiers)
    .map((agence) => {
      const rows = dossiers.filter((dossier) => dossier.agence === agence);
      const lateRate = percent(
        rows.filter((dossier) => isLate(dossier, todayIso)).length,
        rows.length,
      );
      return {
        agence,
        total: rows.length,
        averageDelay: averageDelay(rows.filter(isTreated), todayIso),
        lateRate,
        tone: (lateRate >= 20 ? 'danger' : lateRate >= 10 ? 'warning' : 'success') as
          'danger' | 'warning' | 'success',
      };
    })
    .sort((a, b) => b.lateRate - a.lateRate);
}

export const REPORTS = [
  {
    label: 'Rapport mensuel des traitements',
    description: 'Volumes traités, délais moyens et taux de rejet du mois',
    date: '01/09/2026',
  },
  {
    label: 'Rapport SLA par agence',
    description: "Respect des délais détaillé par agence d'origine",
    date: '15/09/2026',
  },
  {
    label: 'Rapport des dossiers en retard',
    description: 'Liste consolidée des dossiers en dépassement de délai',
    date: '18/09/2026',
  },
  {
    label: "Rapport d'activité Accueil",
    description: 'États réceptionnés et affectations sur la période',
    date: '15/09/2026',
  },
] as const;
