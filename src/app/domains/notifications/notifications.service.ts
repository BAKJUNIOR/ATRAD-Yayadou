import { Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StompClient } from '../../core/realtime/stomp-client';
import { AppConfigService } from '../../core/services/app-config.service';
import { SessionService } from '../../core/services/session.service';
import { formatStamp } from '../../core/utils/date.util';
import { Role } from '../auth/domain/entities/account.entity';
import { ApiNotification, NotificationApi } from './infrastructure/api/notification.api';

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

const TONE: Record<ApiNotification['niveau'], NotificationTone> = {
  INFO: 'info',
  WARN: 'warn',
  DANGER: 'danger',
};

/**
 * Notifications de l'utilisateur connecté, tenues par l'API : la liste est lue à l'ouverture de la session, puis
 * chaque nouvelle notification arrive en temps réel (WebSocket STOMP, file `/user/queue/notifications`).
 */
@Service()
export class NotificationsService {
  private readonly session = inject(SessionService);
  private readonly api = inject(NotificationApi);
  private readonly config = inject(AppConfigService);

  private readonly list = signal<ApiNotification[]>([]);
  private readonly unread = signal(0);
  private socket: StompClient | null = null;

  readonly items = computed<AppNotification[]>(() => {
    const role = this.session.role();
    return this.list().map((notification) => ({
      id: notification.id,
      label: notification.titre,
      meta: [notification.message, formatStamp(notification.creeLe)].filter(Boolean).join(' · '),
      path: pathOf(notification, role),
      tone: TONE[notification.niveau] ?? 'info',
      read: notification.lu,
    }));
  });

  readonly unreadCount = this.unread.asReadonly();

  constructor() {
    effect(() => {
      const token = this.session.token();
      untracked(() => (token ? this.open() : this.close()));
    });
  }

  markRead(id: string): void {
    const notification = this.list().find((candidate) => candidate.id === id);
    if (!notification || notification.lu) {
      return;
    }
    this.api.marquerLue(id).subscribe(() => {
      this.list.update((list) =>
        list.map((item) => (item.id === id ? { ...item, lu: true } : item)),
      );
      this.unread.update((count) => Math.max(0, count - 1));
    });
  }

  markAllRead(): void {
    this.api.toutesLues().subscribe(({ nonLues }) => {
      this.list.update((list) => list.map((item) => ({ ...item, lu: true })));
      this.unread.set(nonLues);
    });
  }

  private open(): void {
    this.api.liste().subscribe((page) => this.list.set(page.content));
    this.api.nonLues().subscribe(({ nonLues }) => this.unread.set(nonLues));
    this.socket?.stop();
    this.socket = new StompClient(
      this.socketUrl(),
      () => ({ Authorization: `Bearer ${this.session.token() ?? ''}` }),
      environment.endpoints.notifications.file,
      (message) => this.receive(message.body),
    );
    this.socket.start();
  }

  private close(): void {
    this.socket?.stop();
    this.socket = null;
    this.list.set([]);
    this.unread.set(0);
  }

  private receive(body: string): void {
    try {
      const notification = JSON.parse(body) as ApiNotification;
      this.list.update((list) => [
        notification,
        ...list.filter((item) => item.id !== notification.id),
      ]);
      if (!notification.lu) {
        this.unread.update((count) => count + 1);
      }
    } catch {
      // Message illisible : ignoré.
    }
  }

  /** `ws(s)://` sur l'adresse de l'API, ou sur l'origine du front quand elle est vide (proxy). */
  private socketUrl(): string {
    const base = this.config.apiBaseUrl || window.location.origin;
    return `${base.replace(/^http/, 'ws')}/${environment.endpoints.notifications.socket}`;
  }
}

/** Écran ouvert au clic, selon l'objet de la notification et le profil. */
function pathOf(notification: ApiNotification, role: Role | null): string {
  const id = notification.objetId ?? '';
  if (notification.objetType === 'DOSSIER' && id) {
    switch (role) {
      case 'agence':
        return `/agence/suivi/${id}`;
      case 'traitement':
        return `/traitement/dossiers/${id}`;
      case 'accueil':
        return '/accueil-central/dossiers-retournes';
      case 'manager':
        return '/pilotage/delais';
    }
  }
  if (notification.objetType === 'ETAT') {
    return role === 'agence' ? '/agence/suivi' : '/accueil-central/etats-recus';
  }
  return '/';
}
