import { Service, effect, inject, signal, untracked } from '@angular/core';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  debounceTime,
  filter,
  map,
  merge,
  share,
  startWith,
  switchMap,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppConfigService } from '../services/app-config.service';
import { SessionService } from '../services/session.service';
import { StompClient } from './stomp-client';

/** État de la connexion temps réel. */
export type RealtimeState = 'off' | 'connecting' | 'live' | 'refused';

const QUEUES = environment.endpoints.tempsReel;

/**
 * Connexion temps réel de la session (WebSocket STOMP), ouverte à la connexion et fermée à la déconnexion. Elle
 * reçoit les notifications et le signal `donnees:maj` : des dossiers ou des états vus par l'utilisateur ont changé.
 * Les écrans relisent alors leurs données (`changes$`, `live()`), sans rechargement de la page. Une reconnexion
 * compte aussi comme un changement : ce qui a été manqué pendant la coupure est rattrapé.
 */
@Service()
export class RealtimeService {
  private readonly session = inject(SessionService);
  private readonly config = inject(AppConfigService);

  private readonly state = signal<RealtimeState>('off');
  private readonly messages = new Subject<{ destination: string; body: string }>();
  private readonly reconnections = new Subject<void>();
  private socket: StompClient | null = null;

  readonly connection = this.state.asReadonly();

  /** Reconnexion après une coupure (pas la première connexion). */
  readonly reconnected$ = this.reconnections.asObservable();

  /** Messages des notifications (corps JSON). */
  readonly notifications$ = this.on(QUEUES.notifications);

  /** Données modifiées sur le serveur ou reconnexion ; regroupées pour ne relire qu'une fois par rafale. */
  readonly changes$: Observable<void> = merge(
    this.on(QUEUES.donnees).pipe(map(() => undefined)),
    this.reconnected$,
  ).pipe(debounceTime(300), share());

  constructor() {
    effect(() => {
      const token = this.session.token();
      untracked(() => (token ? this.open() : this.close()));
    });
  }

  /**
   * Relit `source` tout de suite, puis à chaque changement signalé par le serveur. Une lecture en échec (déjà
   * signalée par l'intercepteur) n'interrompt pas les suivantes.
   */
  live<T>(source: () => Observable<T>): Observable<T> {
    return this.changes$.pipe(
      startWith(undefined),
      switchMap(() => source().pipe(catchError(() => EMPTY))),
    );
  }

  private on(destination: string): Observable<string> {
    return this.messages.pipe(
      filter((message) => message.destination === destination),
      map((message) => message.body),
    );
  }

  private open(): void {
    this.socket?.stop();
    this.state.set('connecting');
    let first = true;
    this.socket = new StompClient({
      url: this.socketUrl(),
      connectHeaders: () => ({ Authorization: `Bearer ${this.session.token() ?? ''}` }),
      destinations: [QUEUES.notifications, QUEUES.donnees],
      onMessage: (message) =>
        this.messages.next({
          destination: message.headers['destination'] ?? '',
          body: message.body,
        }),
      onConnected: () => {
        this.state.set('live');
        if (!first) {
          this.reconnections.next();
        }
        first = false;
      },
      onDisconnected: (refused) => this.state.set(refused ? 'refused' : 'connecting'),
    });
    this.socket.start();
  }

  private close(): void {
    this.socket?.stop();
    this.socket = null;
    this.state.set('off');
  }

  /** `ws(s)://` sur l'adresse de l'API, ou sur l'origine du front quand elle est vide (proxy). */
  private socketUrl(): string {
    const base = this.config.apiBaseUrl || window.location.origin;
    return `${base.replace(/^http/, 'ws')}/${QUEUES.socket}`;
  }
}
