import { StompClient, StompMessage } from './stomp-client';

/** Faux WebSocket : garde les trames envoyées et laisse le test simuler celles du serveur. */
class FakeSocket {
  static last: FakeSocket;
  static readonly OPEN = 1;
  readyState = FakeSocket.OPEN;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeSocket.last = this;
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
  });

  afterEach(() => {
    globalThis.WebSocket = original;
  });

  it('should connect with the token, subscribe once connected and deliver messages', () => {
    const received: StompMessage[] = [];
    const client = new StompClient(
      'ws://localhost/ws/websocket',
      () => ({ Authorization: 'Bearer jeton-1' }),
      '/user/queue/notifications',
      (message) => received.push(message),
    );
    client.start();
    const socket = FakeSocket.last;
    socket.onopen?.();
    expect(socket.sent[0]).toContain('CONNECT\n');
    expect(socket.sent[0]).toContain('Authorization:Bearer jeton-1');

    socket.onmessage?.({ data: 'CONNECTED\nversion:1.2\n\n\u0000' });
    expect(socket.sent[1]).toContain('SUBSCRIBE\nid:sub-0\ndestination:/user/queue/notifications');

    socket.onmessage?.({
      data: 'MESSAGE\ndestination:/user/queue/notifications\ncontent-type:application/json\n\n{"titre":"État à réceptionner"}\u0000',
    });
    expect(received).toEqual([
      {
        headers: { destination: '/user/queue/notifications', 'content-type': 'application/json' },
        body: '{"titre":"État à réceptionner"}',
      },
    ]);
    client.stop();
  });
});
