/** Message STOMP reçu sur un abonnement. */
export interface StompMessage {
  headers: Record<string, string>;
  body: string;
}

const NUL = '\u0000';

/**
 * Client STOMP 1.2 minimal sur le WebSocket du navigateur : connexion avec en-têtes (jeton), un abonnement, lecture
 * des messages. Suffisant pour la file de notifications du backend (Spring, transport WebSocket de SockJS) sans
 * dépendance supplémentaire. Se reconnecte tout seul tant que `stop()` n'a pas été appelé.
 */
export class StompClient {
  private socket: WebSocket | null = null;
  private stopped = false;
  private retry: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly url: string,
    private readonly connectHeaders: () => Record<string, string>,
    private readonly destination: string,
    private readonly onMessage: (message: StompMessage) => void,
    private readonly retryMs = 10_000,
  ) {}

  start(): void {
    this.stopped = false;
    this.open();
  }

  stop(): void {
    this.stopped = true;
    if (this.retry) {
      clearTimeout(this.retry);
      this.retry = null;
    }
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(frame('DISCONNECT', {}));
    }
    this.socket?.close();
    this.socket = null;
  }

  private open(): void {
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.url);
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
          ...this.connectHeaders(),
        }),
      );
    socket.onmessage = (event) => {
      for (const raw of String(event.data).split(NUL)) {
        const parsed = parse(raw);
        if (parsed?.command === 'CONNECTED') {
          socket.send(frame('SUBSCRIBE', { id: 'sub-0', destination: this.destination }));
        } else if (parsed?.command === 'MESSAGE') {
          this.onMessage({ headers: parsed.headers, body: parsed.body });
        }
      }
    };
    socket.onclose = () => {
      if (this.socket === socket) {
        this.socket = null;
        this.scheduleRetry();
      }
    };
  }

  private scheduleRetry(): void {
    if (!this.stopped && !this.retry) {
      this.retry = setTimeout(() => {
        this.retry = null;
        if (!this.stopped) {
          this.open();
        }
      }, this.retryMs);
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
