import { formatStamp, isoDateToFr } from '../../../core/utils/date.util';
import { Status } from '../../../shared/models/status';
import { TimelineEntry, TimelineTone } from '../../../shared/ui/timeline/timeline.component';
import { DossierType } from '../../dossiers/domain/dossier-catalog';
import {
  ApiDossierDetail,
  ApiDossierSuivi,
  agencyStatusOf,
  routedFromApi,
  statusOfEtape,
} from '../../dossiers/domain/entities/dossier-api.entity';
import { DossierLog, EtatDossier, RoutedDossier } from '../../dossiers/domain/entities/dossier.entity';
import { Etat } from '../../dossiers/domain/entities/etat.entity';
import { etatInfo } from '../../dossiers/domain/referentiel';

/** Dossier transmis, vu depuis l'agence : rattaché à son état, avec le statut qu'elle peut voir. */
export interface SuiviDossier extends EtatDossier {
  etat: Etat;
  /** Suite donnée au dossier une fois réceptionné et routé ; absente tant qu'il ne l'est pas. */
  routed?: RoutedDossier;
}

/** Statuts montrés tels quels à l'agence ; les étapes internes du traitement deviennent « En cours ». */
const AGENCY_VISIBLE: readonly Status[] = [
  'Transmis',
  'Reçu',
  'Non reçu',
  'En attente de document(s) complémentaire(s)',
  'Dossier retourné',
  'Retourné en agence',
  'Validé',
  'Clôturé',
  'Rejeté',
  'Retour en cours',
];

function visibleStatus(status: Status, returned: boolean): Status {
  if (status === 'Rejeté' && !returned) {
    return 'Retour en cours';
  }
  return AGENCY_VISIBLE.includes(status) ? status : 'En cours';
}

function statusForAgency(etat: Etat, dossier: EtatDossier, routed?: RoutedDossier): Status {
  if (routed) {
    return visibleStatus(routed.status, !!routed.renvoyeAt);
  }
  if (dossier.nonRec && !dossier.rec) {
    return 'Non reçu';
  }
  if (etat.status === 'En cours') {
    return visibleStatus(dossier.status || 'Reçu', false);
  }
  return visibleStatus(etat.status === 'Reçu partiellement' ? 'Transmis' : etat.status, false);
}

/** Dossiers des états d'une agence, du plus récemment saisi au plus ancien. */
export function suiviDossiers(
  etats: readonly Etat[],
  routedDossiers: readonly RoutedDossier[],
  agenceCode: string,
): SuiviDossier[] {
  const routedByRef = new Map(routedDossiers.map((dossier) => [dossier.ref, dossier]));
  return etats
    .filter((etat) => etat.code === agenceCode)
    .flatMap((etat) =>
      etat.dossiers.map((dossier) => {
        const routed = routedByRef.get(dossier.ref);
        return {
          ...dossier,
          etat,
          routed,
          entite: routed?.entite,
          status: statusForAgency(etat, dossier, routed),
        };
      }),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.ref.localeCompare(a.ref));
}

/** Ligne de la liste « Suivi des dossiers », lue dans l'API (statut déjà vu depuis l'agence). */
export interface SuiviRow {
  id: string;
  ref: string;
  client: string;
  num: string;
  compte: string;
  type: DossierType;
  status: Status;
  createdAt: string;
  etatRef: string;
  etatId: string;
}

export function suiviRowFromApi(row: ApiDossierSuivi): SuiviRow {
  return {
    id: row.id,
    ref: row.reference,
    client: row.client || 'Client non renseigné',
    num: row.tiersNumero ?? '',
    compte: row.numeroCompte ?? '',
    type: row.typeDossier,
    status: statusOfEtape(row.etape),
    createdAt: row.creeLe,
    etatRef: row.etatReference ?? '',
    etatId: row.etatId ?? '',
  };
}

/**
 * Fiche d'un dossier transmis à partir de l'API : son détail et, s'il est connu, son état d'origine (pointage de
 * réception). Le statut est celui que voit l'agence.
 */
export function suiviDossierOf(detail: ApiDossierDetail, etat: Etat | null): SuiviDossier {
  const ligne = etat?.dossiers.find((dossier) => dossier.id === detail.dossier.id);
  const routed = routedFromApi(detail, etat?.ref ?? '');
  const recu = detail.dossier.statut !== 'TRANSMIS' && detail.dossier.statut !== 'TEMPORAIRE';
  return {
    ...routed,
    status: agencyStatusOf(detail.dossier.statut, !!ligne?.nonRec && !ligne.rec),
    transmisAt: etat?.sentAt ?? '',
    rec: ligne?.rec,
    nonRec: ligne?.nonRec,
    entite: recu ? routed.entite : undefined,
    etat: etat ?? EMPTY_ETAT,
    routed: recu ? routed : undefined,
  };
}

const EMPTY_ETAT: Etat = {
  ref: '',
  agence: '',
  code: '',
  type: '',
  createdAt: '',
  sentAt: '',
  status: 'Transmis',
  receivedAt: '',
  emetteur: '',
  dest: '',
  dossiers: [],
  prints: [],
};

/** Historique en frise, du plus ancien au plus récent. */
export function timelineOf(logs: readonly DossierLog[]): TimelineEntry[] {
  return [...logs]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((log) => ({ label: log.label, who: log.who, at: formatStamp(log.at), tone: log.tone }));
}

export interface SuiviCriteria {
  num: string;
  nom: string;
  compte: string;
  ref: string;
  etat: string;
  type: DossierType | '';
}

export const EMPTY_CRITERIA: SuiviCriteria = {
  num: '',
  nom: '',
  compte: '',
  ref: '',
  etat: '',
  type: '',
};

export function countCriteria(criteria: SuiviCriteria): number {
  return Object.values(criteria).filter((value) => value.trim()).length;
}

export function matchesCriteria(dossier: SuiviRow, criteria: SuiviCriteria): boolean {
  const includes = (value: string, query: string): boolean =>
    value.toLowerCase().includes(query.trim().toLowerCase());
  return (
    includes(dossier.num, criteria.num) &&
    includes(dossier.client, criteria.nom) &&
    includes(dossier.compte, criteria.compte) &&
    includes(dossier.ref, criteria.ref) &&
    includes(dossier.etatRef, criteria.etat) &&
    (!criteria.type || dossier.type === criteria.type)
  );
}

/** Filtres rapides par statut proposés au-dessus de la liste. */
export const SUIVI_STATUS_FILTERS: readonly { status: Status; label: string }[] = [
  { status: 'Transmis', label: 'Transmis' },
  { status: 'En cours', label: 'En cours' },
  { status: 'En attente de document(s) complémentaire(s)', label: 'À compléter' },
  { status: 'Dossier retourné', label: 'Dossier retourné' },
  { status: 'Retourné en agence', label: 'Retourné en agence' },
  { status: 'Validé', label: 'Validé' },
  { status: 'Clôturé', label: 'Clôturé' },
];

/** Libellé court d'un statut dans une liste. */
export function shortStatusLabel(status: Status): string {
  return status === 'En attente de document(s) complémentaire(s)' ? 'À compléter' : status;
}

export interface ReceptionLabel {
  label: string;
  tone: 'brand' | 'danger' | 'warning';
}

/** État du pointage d'un dossier par l'entité réceptrice. */
export function receptionLabel(etat: Etat, dossier: EtatDossier): ReceptionLabel {
  if (dossier.rec) {
    return { label: `Reçu le ${formatStamp(dossier.rec.at)}`, tone: 'brand' };
  }
  if (dossier.nonRec) {
    return { label: `Non reçu (pointage du ${formatStamp(dossier.nonRec.at)})`, tone: 'danger' };
  }
  return { label: etat.sentAt ? 'En attente de réception' : '—', tone: 'warning' };
}

/** Historique d'un dossier tel que l'agence peut le consulter, du plus ancien au plus récent. */
export function dossierHistory(dossier: SuiviDossier): TimelineEntry[] {
  const { etat } = dossier;
  const events: { at: string; label: string; who: string; tone: TimelineTone }[] = [];
  const push = (at: string | undefined, label: string, who: string, tone: TimelineTone): void => {
    if (at) {
      events.push({ at, label, who, tone });
    }
  };

  push(
    dossier.createdAt || etat.createdAt,
    `Dossier créé et ajouté à l'état ${etat.ref}`,
    etat.emetteur,
    'neutral',
  );
  for (const log of dossier.log.filter((entry) => entry.pre)) {
    push(log.at, log.label, log.who, log.tone);
  }
  push(
    etat.sentAt,
    `État ${etat.ref} validé et transmis vers ${etatInfo(etat).dest}`,
    etat.emetteur,
    'info',
  );
  if (dossier.nonRec) {
    push(dossier.nonRec.at, 'Non reçu lors du pointage par l’Accueil', dossier.nonRec.by, 'danger');
  }
  if (dossier.rec) {
    push(dossier.rec.at, `Reçu par ${dossier.rec.by}`, etatInfo(etat).dest, 'brand');
  } else if (!dossier.nonRec && etat.receivedAt) {
    push(
      etat.receivedAt,
      "Réception confirmée par l'entité réceptrice",
      etat.receivedBy ?? '',
      'brand',
    );
  }
  const routed = dossier.routed;
  if (routed) {
    push(routed.affecte, `Routé automatiquement vers ${routed.entite}`, routed.affectedBy, 'info');
    for (const log of routed.log.filter((entry) => !entry.pre)) {
      push(log.at, log.label, log.who, log.tone);
    }
  }

  return events
    .map((event, index) => ({ ...event, index }))
    .sort((a, b) => a.at.localeCompare(b.at) || a.index - b.index)
    .map((event) => ({
      label: event.label,
      who: event.who,
      at: formatStamp(event.at),
      tone: event.tone,
    }));
}

/** Encart expliquant à l'agence pourquoi un dossier lui revient ou ce qu'on attend d'elle. */
export interface ReturnNotice {
  title: string;
  text: string;
  /** Compléments demandés, quand ils ne figurent pas déjà dans `text`. */
  complements: string;
}

const MOTIF_TITLES: Partial<Record<Status, string>> = {
  'Dossier retourné': 'Motif du retour (non-éligibilité)',
  Rejeté: 'Motif du rejet (absence de complément)',
};

/** Motif du retour ou documents attendus d'un dossier ; `null` s'il n'y a rien à signaler. */
export function returnNotice(dossier: SuiviDossier, todayIso: string): ReturnNotice | null {
  const routed = dossier.routed;
  if (!routed) {
    return null;
  }
  const status = dossier.status;
  const awaiting = status === 'En attente de document(s) complémentaire(s)';
  const sentBack = status === 'Retourné en agence';
  const returned = status === 'Dossier retourné' || sentBack;
  const missing = routed.docsMissing?.join(', ') || routed.complements || '';

  let title: string;
  let text: string;
  if (awaiting) {
    title = 'Document(s) complémentaire(s) attendu(s)';
    text = `Pièce(s) à fournir : ${missing || '—'}`;
    if (routed.docsDeadlineIso) {
      const late = todayIso > routed.docsDeadlineIso ? ' (délai dépassé)' : '';
      text += ` — avant le ${isoDateToFr(routed.docsDeadlineIso)}${late}`;
    }
    if (routed.docsNote) {
      text += `. Remarque de l'entité : ${routed.docsNote}`;
    }
  } else if (returned && routed.docsRetAt) {
    title = sentBack ? "Renvoyé à l'agence faute de document(s)" : 'Retourné faute de document(s)';
    text = `Document(s) manquant(s) : ${missing || '—'}`;
    if (routed.rejectReason) {
      text += ` · motif : ${routed.rejectReason}`;
    }
    if (sentBack && routed.renvoyeAt) {
      text += ` · renvoyé par l'entité réceptrice le ${formatStamp(routed.renvoyeAt)}`;
    }
  } else {
    title = sentBack ? "Renvoyé à l'agence (non-éligibilité)" : (MOTIF_TITLES[status] ?? '');
    text = routed.rejectReason ?? '';
  }
  if (!title || !text) {
    return null;
  }
  const inText = awaiting || (returned && !!routed.docsRetAt);
  return { title, text, complements: inText ? '' : (routed.complements ?? '') };
}
