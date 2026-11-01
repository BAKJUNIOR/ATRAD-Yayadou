import { toIsoDate } from '../../../core/utils/date.util';
import { RoutedDossier } from '../../dossiers/domain/entities/dossier.entity';
import { Etat } from '../../dossiers/domain/entities/etat.entity';
import { etatInfo } from '../../dossiers/domain/referentiel';

export interface AuditEvent {
  at: string;
  who: string;
  label: string;
  /** État ou dossier concerné. */
  target: string;
  category: string;
}

/** Catégories d'action, reconnues d'après le libellé de l'événement (la première qui correspond). */
const CATEGORIES: readonly [string, RegExp][] = [
  ['Changement de statut', /changement de statut/i],
  ['Création', /créé/i],
  ['Transmission', /transmis/i],
  ['Réception', /récept|reçu|pointé/i],
  ['Routage', /déposé|rout/i],
  ['Affectation', /affect|répartiteur|pris en charge|prend/i],
  ['Modification', /modifi/i],
  ['Retour / rejet', /retour|rejet|renvoy|complément/i],
  ['Validation / clôture', /valid|clôtur|traité/i],
];

const OTHER = 'Autre';

export const AUDIT_CATEGORIES: readonly string[] = [
  ...CATEGORIES.map(([category]) => category),
  OTHER,
];

/** Classe de couleur d'une catégorie d'action. */
export const CATEGORY_TEXT: Record<string, string> = {
  Création: 'text-ink-muted',
  Transmission: 'text-info',
  Réception: 'text-brand-ink',
  Routage: 'text-info',
  Affectation: 'text-brand-mid',
  Modification: 'text-warning',
  'Retour / rejet': 'text-danger',
  'Validation / clôture': 'text-success',
};

function categoryOf(label: string): string {
  return CATEGORIES.find(([, pattern]) => pattern.test(label))?.[0] ?? OTHER;
}

/** Piste d'audit reconstituée à partir des états et des dossiers, du plus récent au plus ancien. */
export function auditEvents(
  etats: readonly Etat[],
  dossiers: readonly RoutedDossier[],
): AuditEvent[] {
  const events: Omit<AuditEvent, 'category'>[] = [];
  const add = (at: string | undefined, who: string | undefined, label: string, target: string) => {
    if (at) {
      events.push({ at, who: who || 'Système', label, target });
    }
  };

  for (const etat of etats) {
    add(etat.createdAt || etat.sentAt, etat.emetteur, 'État créé', etat.ref);
    const info = etatInfo(etat);
    add(
      etat.sentAt,
      etat.emetteur,
      `État validé et transmis à ${info.dest} (type « ${info.nom} »)`,
      etat.ref,
    );
    add(etat.receivedAt, etat.receivedBy || info.dest, "Réception de l'état confirmée", etat.ref);
    for (const log of etat.recLog ?? []) {
      for (const ref of log.refs) {
        add(log.at, log.by, 'Dossier réceptionné (pointé reçu)', `${ref} · ${etat.ref}`);
      }
      if (log.missing) {
        add(log.at, log.by, `${log.missing} dossier(s) non reçu(s)`, etat.ref);
      }
    }
  }
  for (const dossier of dossiers) {
    for (const log of dossier.log) {
      add(log.at, log.who, log.label, dossier.ref);
    }
    add(
      dossier.renvoyeAt,
      dossier.renvoyeBy,
      `Dossier renvoyé à l'agence ${dossier.agence}`,
      dossier.ref,
    );
  }

  const seen = new Set<string>();
  return events
    .filter((event) => {
      const key = event.at + event.who + event.label + event.target;
      return !seen.has(key) && !!seen.add(key);
    })
    .map((event) => ({ ...event, category: categoryOf(event.label) }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

export interface AuditFilter {
  user: string;
  category: string;
  /** Bornes de date incluses (`yyyy-MM-dd`). */
  from: string;
  to: string;
  query: string;
}

export const EMPTY_AUDIT_FILTER: AuditFilter = {
  user: '',
  category: '',
  from: '',
  to: '',
  query: '',
};

export function filterAudit(events: readonly AuditEvent[], filter: AuditFilter): AuditEvent[] {
  const query = filter.query.trim().toLowerCase();
  return events.filter((event) => {
    const day = toIsoDate(new Date(event.at));
    return (
      (!filter.user || event.who === filter.user) &&
      (!filter.category || event.category === filter.category) &&
      (!filter.from || day >= filter.from) &&
      (!filter.to || day <= filter.to) &&
      (!query || `${event.target} ${event.label}`.toLowerCase().includes(query))
    );
  });
}
