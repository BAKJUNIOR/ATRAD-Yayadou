import { Service, computed, inject, signal } from '@angular/core';
import { SessionService } from '../../core/services/session.service';
import { StorageService } from '../../core/services/storage.service';
import { formatDateTime } from '../../core/utils/date.util';
import { entityCode } from '../../core/utils/text.util';
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
 * Seul le profil agence en reçoit pour l'instant ; les autres seront ajoutés avec leurs parcours.
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
    if (account?.role !== 'agence') {
      return [];
    }
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

    const mine = this.store.etats().filter((etat) => etat.code === entityCode(account.entity));
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

    const read = this.readMap();
    return found.map((item) => ({ ...item, read: !!read[this.key(account.role, item.id)] }));
  });

  readonly unreadCount = computed(() => this.items().filter((item) => !item.read).length);

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
