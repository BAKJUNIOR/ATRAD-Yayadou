/** Message STOMP reçu sur un abonnement. */
export interface StompMessage {
  headers: Record<string, string>;
  body: string;
}

/** Réglages et rappels d'un client STOMP. */
export interface StompOptions {
  url: string;
  /** En-têtes de la trame CONNECT, relus à chaque (re)connexion (jeton à jour). */
  connectHeaders: () => Record<string, string>;
  /** Files abonnées après la connexion ; `headers.destination` dit d'où vient chaque message. */
  destinations: readonly string[];
  onMessage: (message: StompMessage) => void;
  /** Connexion établie et abonnement fait : l'appelant peut rattraper ce qui a été manqué. */
  onConnected?: () => void;
  /** Connexion perdue, ou refusée par le serveur. */
  onDisconnected?: (refused: boolean) => void;
  /** Tentatives de reconnexion avant d'abandonner (10 par défaut). */
  maxAttempts?: number;
  /** Premier délai de reconnexion, doublé à chaque échec jusqu'à 30 s (2 s par défaut). */
  retryMs?: number;
}

const NUL = '\u0000';
const MAX_DELAY_MS = 30_000;

/**
 * Client STOMP 1.2 minimal sur le WebSocket du navigateur, sans dépendance : connexion avec en-têtes (jeton), un
 * abonnements, lecture des messages. Reconnexion bornée et progressive, comme le client Socket.IO d'ATHL ; une
 * trame `ERROR` du serveur (jeton refusé) arrête les tentatives.
 */
export class StompClient {
  private socket: WebSocket | null = null;
  private stopped = false;
  private attempts = 0;
  private retry: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: StompOptions) {}

  start(): void {
    this.stopped = false;
    this.attempts = 0;
    this.open();
  }

  stop(): void {
    this.stopped = true;
    this.clearRetry();
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(frame('DISCONNECT', {}));
    }
    this.socket?.close();
    this.socket = null;
  }

  private open(): void {
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.options.url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.socket = socket;
    socket.onopen = () =>
      socket.send(
        frame('CONNECT', {
          'accept-version': '1.2',
          'heart-beat': '0,0',
          ...this.options.connectHeaders(),
        }),
      );
    socket.onmessage = (event) => {
      for (const raw of String(event.data).split(NUL)) {
        const parsed = parse(raw);
        if (parsed?.command === 'CONNECTED') {
          this.options.destinations.forEach((destination, index) =>
            socket.send(frame('SUBSCRIBE', { id: `sub-${index}`, destination })),
          );
          this.attempts = 0;
          this.options.onConnected?.();
        } else if (parsed?.command === 'MESSAGE') {
          this.options.onMessage({ headers: parsed.headers, body: parsed.body });
        } else if (parsed?.command === 'ERROR') {
          // Connexion refusée (jeton invalide ou expiré) : inutile d'insister.
          this.stopped = true;
          this.options.onDisconnected?.(true);
          socket.close();
        }
      }
    };
    socket.onclose = () => {
      if (this.socket === socket) {
        this.socket = null;
        if (!this.stopped) {
          this.options.onDisconnected?.(false);
          this.scheduleRetry();
        }
      }
    };
  }

  private scheduleRetry(): void {
    const max = this.options.maxAttempts ?? 10;
    if (this.stopped || this.retry || this.attempts >= max) {
      return;
    }
    const delay = Math.min(MAX_DELAY_MS, (this.options.retryMs ?? 2000) * 2 ** this.attempts);
    this.attempts++;
    this.retry = setTimeout(() => {
      this.retry = null;
      if (!this.stopped) {
        this.open();
      }
    }, delay);
  }

  private clearRetry(): void {
    if (this.retry) {
      clearTimeout(this.retry);
      this.retry = null;
    }
  }
}

function frame(command: string, headers: Record<string, string>, body = ''): string {
  const lines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
  return `${command}\n${lines.join('\n')}\n\n${body}${NUL}`;
}

function parse(
  raw: string,
): { command: string; headers: Record<string, string>; body: string } | null {
  const text = raw.replace(/^\n+/, '');
  if (!text) {
    return null;
  }
  const separator = text.indexOf('\n\n');
  const head = separator < 0 ? text : text.slice(0, separator);
  const [command, ...lines] = head.split('\n');
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon > 0) {
      headers[line.slice(0, colon)] = line.slice(colon + 1);
    }
  }
  return { command: command.trim(), headers, body: separator < 0 ? '' : text.slice(separator + 2) };
}
