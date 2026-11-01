import { StompClient, StompMessage, StompOptions } from './stomp-client';

/** Faux WebSocket : garde les trames envoyées et laisse le test simuler celles du serveur. */
class FakeSocket {
  static last: FakeSocket;
  static count = 0;
  static readonly OPEN = 1;
  readyState = FakeSocket.OPEN;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.last = this;
    FakeSocket.count++;
  }

  send(frame: string): void {
    this.sent.push(frame);
  }

  close(): void {
    this.readyState = 3;
  }
}

describe('StompClient', () => {
  const original = globalThis.WebSocket;

  beforeEach(() => {
    globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
    FakeSocket.count = 0;
  });

  afterEach(() => {
    globalThis.WebSocket = original;
    vi.useRealTimers();
  });

  function client(extra: Partial<StompOptions> = {}): StompClient {
    return new StompClient({
      url: 'ws://localhost/ws/websocket',
      connectHeaders: () => ({ Authorization: 'Bearer jeton-1' }),
      destinations: ['/user/queue/notifications', '/user/queue/donnees'],
      onMessage: () => undefined,
      ...extra,
    });
  }

  it('should connect with the token, subscribe to each queue once connected and deliver messages', () => {
    const received: StompMessage[] = [];
    let connected = 0;
    const stomp = client({
      onMessage: (message) => received.push(message),
      onConnected: () => connected++,
    });
    stomp.start();
    const socket = FakeSocket.last;
    socket.onopen?.();
    expect(socket.sent[0]).toContain('CONNECT\n');
    expect(socket.sent[0]).toContain('Authorization:Bearer jeton-1');

    socket.onmessage?.({ data: 'CONNECTED\nversion:1.2\n\n\u0000' });
    expect(socket.sent[1]).toContain('SUBSCRIBE\nid:sub-0\ndestination:/user/queue/notifications');
    expect(socket.sent[2]).toContain('SUBSCRIBE\nid:sub-1\ndestination:/user/queue/donnees');
    expect(connected).toBe(1);

    socket.onmessage?.({
      data: 'MESSAGE\ndestination:/user/queue/notifications\ncontent-type:application/json\n\n{"titre":"État à réceptionner"}\u0000',
    });
    expect(received).toEqual([
      {
        headers: { destination: '/user/queue/notifications', 'content-type': 'application/json' },
        body: '{"titre":"État à réceptionner"}',
      },
    ]);
    stomp.stop();
  });

  it('should reconnect with a growing delay, then give up', () => {
    vi.useFakeTimers();
    let lost = 0;
    const stomp = client({ maxAttempts: 2, retryMs: 1000, onDisconnected: () => lost++ });
    stomp.start();
    FakeSocket.last.onclose?.();
    expect(lost).toBe(1);
    vi.advanceTimersByTime(999);
    expect(FakeSocket.count).toBe(1);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.count).toBe(2);

    FakeSocket.last.onclose?.();
    vi.advanceTimersByTime(1999);
    expect(FakeSocket.count).toBe(2);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.count).toBe(3);

    FakeSocket.last.onclose?.();
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.count).toBe(3);
    stomp.stop();
  });

  it('should stop retrying when the server refuses the connection', () => {
    vi.useFakeTimers();
    const refusals: boolean[] = [];
    const stomp = client({ onDisconnected: (refused) => refusals.push(refused) });
    stomp.start();
    const socket = FakeSocket.last;
    socket.onmessage?.({ data: 'ERROR\nmessage:Jeton invalide\n\n\u0000' });
    socket.onclose?.();
    vi.advanceTimersByTime(60_000);
    expect(refusals).toEqual([true]);
    expect(FakeSocket.count).toBe(1);
    stomp.stop();
  });
});
