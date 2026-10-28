import { Service, computed, inject, signal } from '@angular/core';
import { SessionService } from '../../core/services/session.service';
import { StorageService } from '../../core/services/storage.service';
import { formatStamp, isoDateToFr } from '../../core/utils/date.util';
import { entityCode } from '../../core/utils/text.util';
import { pendingEtats, pendingReturns, remainingCount } from '../accueil/domain/reception';
import { ReceptionContext } from '../accueil/presentation/reception-context.service';
import { isLocked } from '../dossiers/domain/workflow';
import { TransmissionStore } from '../dossiers/infrastructure/store/transmission.store';
import { isLate, unassigned } from '../traitement/domain/portfolio';
import { TraitementContext } from '../traitement/presentation/traitement-context.service';

const READ_KEY = 'atrad_notif_read_v1';

export type NotificationTone = 'info' | 'warn' | 'danger';

export interface AppNotification {
  id: string;
  label: string;
  meta: string;
  /** Écran ouvert au clic. */
  path: string;
  tone: NotificationTone;
  read: boolean;
}

/**
 * Notifications de l'utilisateur connecté, déduites de l'état des dossiers.
 * Profils couverts : agence, accueil, traitement et pilotage ; les autres seront ajoutés avec leurs parcours.
 */
@Service()
export class NotificationsService {
  private readonly session = inject(SessionService);
  private readonly store = inject(TransmissionStore);
  private readonly storage = inject(StorageService);
  private readonly traitement = inject(TraitementContext);
  private readonly reception = inject(ReceptionContext);

  private readonly readMap = signal<Record<string, boolean>>(
    this.storage.get<Record<string, boolean>>(READ_KEY) ?? {},
  );

  readonly items = computed<AppNotification[]>(() => {
    const account = this.session.account();
    if (!account) {
      return [];
    }
    const found =
      account.role === 'agence'
        ? this.forAgence(account.entity)
        : account.role === 'accueil'
          ? this.forAccueil()
          : account.role === 'traitement'
            ? // Entité qui réceptionne aussi : ses notifications de réception s'ajoutent.
              [...(this.reception.canReceive() ? this.forAccueil() : []), ...this.forTraitement()]
            : account.role === 'manager'
              ? this.forManager()
              : [];
    const read = this.readMap();
    return found.map((item) => ({ ...item, read: !!read[this.key(account.role, item.id)] }));
  });

  readonly unreadCount = computed(() => this.items().filter((item) => !item.read).length);

  private forAccueil(): Omit<AppNotification, 'read'>[] {
    const found: Omit<AppNotification, 'read'>[] = [];
    const pending = pendingEtats(this.reception.etats());
    if (pending.length) {
      found.push({
        id: `pend:${pending.map((etat) => etat.ref + remainingCount(etat)).join(',')}`,
        label: `${pending.length} état(s) de transmission reçu(s) à réceptionner`,
        meta: pending.map((etat) => etat.ref).join(', '),
        path: '/accueil-central/etats-recus',
        tone: 'warn',
      });
    }
    const returns = pendingReturns(this.reception.dossiers());
    if (returns.length) {
      found.push({
        id: `ret:${returns.map((dossier) => dossier.ref).join(',')}`,
        label: `${returns.length} dossier(s) retourné(s) à traiter`,
        meta: "Renvoi à l'entité émettrice en attente",
        path: '/accueil-central/dossiers-retournes',
        tone: 'danger',
      });
    }
    return found;
  }

  private forManager(): Omit<AppNotification, 'read'>[] {
    const found: Omit<AppNotification, 'read'>[] = [];
    const late = this.store.dossiers().filter((dossier) => isLate(dossier, this.traitement.today));
    if (late.length) {
      found.push({
        id: `mlate:${late.map((dossier) => dossier.ref).join(',')}`,
        label: `${late.length} dossier(s) en retard sur l'ensemble des entités`,
        meta: 'Respect des délais',
        path: '/pilotage/delais',
        tone: 'danger',
      });
    }
    const partial = this.store.etats().filter((etat) => etat.status === 'Reçu partiellement');
    if (partial.length) {
      found.push({
        id: `part:${partial.map((etat) => etat.ref).join(',')}`,
        label: `${partial.length} état(s) reçu(s) partiellement`,
        meta: partial.map((etat) => etat.ref).join(', '),
        path: '/pilotage/tableau-de-bord',
        tone: 'warn',
      });
    }
    return found;
  }

  private forTraitement(): Omit<AppNotification, 'read'>[] {
    const found: Omit<AppNotification, 'read'>[] = [];
    const mine = this.traitement.myDossiers();
    for (const dossier of mine.filter((candidate) => !isLocked(candidate))) {
      found.push({
        id: `aff:${dossier.ref}:${dossier.gestAt}`,
        label: `Dossier ${dossier.ref} affecté à vous`,
        meta:
          `${dossier.type} · ${dossier.client}` +
          (dossier.gestAt ? ` · ${formatStamp(dossier.gestAt)}` : ''),
        path: `/traitement/dossiers/${dossier.ref}`,
        tone: 'info',
      });
    }
    const late = mine.filter((dossier) => isLate(dossier, this.traitement.today));
    if (late.length) {
      found.push({
        id: `late:${late.map((dossier) => dossier.ref).join(',')}`,
        label: `${late.length} dossier(s) en retard`,
        meta: this.traitement.entiteShort(),
        path: '/traitement/retard-clotures',
        tone: 'danger',
      });
    }
    const waiting = unassigned(this.traitement.entityDossiers());
    if (waiting.length) {
      found.push({
        id: `pool:${waiting.map((dossier) => dossier.ref).join(',')}`,
        label: `${waiting.length} dossier(s) non pris en charge`,
        meta: this.traitement.entiteShort(),
        path: this.traitement.functions().affecter
          ? '/traitement/affectation'
          : this.traitement.functions().pool
            ? '/traitement/pool'
            : '/traitement/mes-dossiers',
        tone: 'warn',
      });
    }
    return found;
  }

  private forAgence(entity: string): Omit<AppNotification, 'read'>[] {
    const found: Omit<AppNotification, 'read'>[] = [];
    const draft = this.store.draft();
    if (draft.length) {
      found.push({
        id: `draft:${draft.length}`,
        label: `État en cours de constitution : ${draft.length} dossier(s) non transmis`,
        meta: 'Statut Temporaire',
        path: '/agence/creer-etat',
        tone: 'warn',
      });
    }

    const mine = this.store.etats().filter((etat) => etat.code === entityCode(entity));
    const waiting = mine.filter((etat) => !etat.receivedAt);
    if (waiting.length) {
      const refs = waiting.map((etat) => etat.ref).join(', ');
      found.push({
        id: `wait:${refs}`,
        label: `${waiting.length} état(s) transmis en attente de réception par l'entité réceptrice`,
        meta: refs,
        path: '/agence/suivi',
        tone: 'info',
      });
    }
    for (const etat of mine) {
      for (const dossier of etat.dossiers) {
        if (dossier.nonRec && !dossier.rec) {
          found.push({
            id: `nonrec:${dossier.ref}:${dossier.nonRec.at}`,
            label: `Dossier ${dossier.ref} non reçu par l'entité réceptrice`,
            meta: `État ${etat.ref} · pointage du ${formatStamp(dossier.nonRec.at)}`,
            path: `/agence/suivi/${dossier.ref}`,
            tone: 'danger',
          });
        }
      }
    }

    // Suites données par l'entité de traitement aux dossiers de l'agence.
    for (const dossier of this.store
      .dossiers()
      .filter((candidate) => candidate.agence === entity)) {
      const missing = (dossier.docsMissing ?? []).join(', ') || dossier.complements || '—';
      const context = `${dossier.type} · ${dossier.client}`;
      const path = `/agence/suivi/${dossier.ref}`;
      if (dossier.docsReqAt) {
        found.push({
          id: `docreq:${dossier.ref}:${dossier.docsReqAt}`,
          label: `Dossier ${dossier.ref} : document(s) attendu(s) : ${missing} — à fournir avant le ${isoDateToFr(dossier.docsDeadlineIso ?? '')}`,
          meta: `${context} · ${formatStamp(dossier.docsReqAt)}`,
          path,
          tone: 'warn',
        });
      }
      if (dossier.docsRetAt) {
        found.push({
          id: `docret:${dossier.ref}:${dossier.docsRetAt}`,
          label: `Dossier ${dossier.ref} retourné faute de document(s) : ${missing}`,
          meta: `${context} · ${formatStamp(dossier.docsRetAt)}`,
          path,
          tone: 'danger',
        });
      }
      if (dossier.renvoyeAt) {
        found.push({
          id: `renv:${dossier.ref}:${dossier.renvoyeAt}`,
          label:
            `Dossier ${dossier.ref} renvoyé à l'agence — ` +
            (dossier.docsRetAt
              ? `document(s) manquant(s) : ${missing}`
              : `motif : ${dossier.rejectReason || '—'}`),
          meta: `${context} · ${formatStamp(dossier.renvoyeAt)}`,
          path,
          tone: 'danger',
        });
      }
    }
    return found;
  }

  markRead(id: string): void {
    this.mark([id]);
  }

  markAllRead(): void {
    this.mark(this.items().map((item) => item.id));
  }

  private mark(ids: string[]): void {
    const role = this.session.role();
    if (!role) {
      return;
    }
    this.readMap.update((read) => ({
      ...read,
      ...Object.fromEntries(ids.map((id) => [this.key(role, id), true])),
    }));
    this.storage.set(READ_KEY, this.readMap());
  }

  private key(role: string, id: string): string {
    return `${role}:${id}`;
  }
}
