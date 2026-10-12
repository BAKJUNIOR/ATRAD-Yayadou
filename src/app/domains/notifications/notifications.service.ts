import { Service, computed, inject, signal } from '@angular/core';
import { SessionService } from '../../core/services/session.service';
import { StorageService } from '../../core/services/storage.service';
import { formatDateTime } from '../../core/utils/date.util';
import { entityCode } from '../../core/utils/text.util';
import { pendingEtats, pendingReturns, remainingCount } from '../accueil/domain/reception';
import { TransmissionStore } from '../dossiers/infrastructure/store/transmission.store';

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
 * Profils couverts : agence et accueil ; les autres seront ajoutés avec leurs parcours.
 */
@Service()
export class NotificationsService {
  private readonly session = inject(SessionService);
  private readonly store = inject(TransmissionStore);
  private readonly storage = inject(StorageService);

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
          : [];
    const read = this.readMap();
    return found.map((item) => ({ ...item, read: !!read[this.key(account.role, item.id)] }));
  });

  readonly unreadCount = computed(() => this.items().filter((item) => !item.read).length);

  private forAccueil(): Omit<AppNotification, 'read'>[] {
    const found: Omit<AppNotification, 'read'>[] = [];
    const pending = pendingEtats(this.store.etats());
    if (pending.length) {
      found.push({
        id: `pend:${pending.map((etat) => etat.ref + remainingCount(etat)).join(',')}`,
        label: `${pending.length} état(s) de transmission reçu(s) à réceptionner`,
        meta: pending.map((etat) => etat.ref).join(', '),
        path: '/accueil-central/etats-recus',
        tone: 'warn',
      });
    }
    const returns = pendingReturns(this.store.dossiers());
    if (returns.length) {
      found.push({
        id: `ret:${returns.map((dossier) => dossier.ref).join(',')}`,
        label: `${returns.length} dossier(s) retourné(s) à traiter`,
        meta: "Renvoi à l'agence en attente",
        path: '/accueil-central/dossiers-retournes',
        tone: 'danger',
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
        label: `${waiting.length} état(s) transmis en attente de réception à l'Accueil`,
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
            label: `Dossier ${dossier.ref} non reçu par l'Accueil`,
            meta: `État ${etat.ref} · pointage du ${formatDateTime(dossier.nonRec.at)}`,
            path: `/agence/suivi/${dossier.ref}`,
            tone: 'danger',
          });
        }
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
