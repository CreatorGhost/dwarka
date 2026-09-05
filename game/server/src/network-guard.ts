export const DEFAULT_NETWORK_LIMITS = {
  maxConnections: 64,
  maxConnectionsPerPeer: 32,
  resumeDeadlineMs: 5_000,
  inboundMessagesPerSecond: 60,
  inboundBurst: 120,
  maxBufferedBytes: 256 * 1_024,
  maxSlowChecks: 40,
} as const;

export type ConnectionLease = { release(): void };

export class ConnectionLimiter {
  private total = 0;
  private readonly peers = new Map<string, number>();

  constructor(
    private readonly maxTotal: number,
    private readonly maxPerPeer: number,
  ) {}

  acquire(peer: string): ConnectionLease | null {
    const peerCount = this.peers.get(peer) ?? 0;
    if (this.total >= this.maxTotal || peerCount >= this.maxPerPeer) return null;
    this.total += 1;
    this.peers.set(peer, peerCount + 1);
    let released = false;
    return {
      release: () => {
        if (released) return;
        released = true;
        this.total -= 1;
        const remaining = (this.peers.get(peer) ?? 1) - 1;
        if (remaining <= 0) this.peers.delete(peer);
        else this.peers.set(peer, remaining);
      },
    };
  }
}

export class MessageRateLimiter {
  private tokens: number;
  private updatedAt: number;

  constructor(
    private readonly refillPerSecond: number,
    private readonly capacity: number,
    private readonly now: () => number = Date.now,
  ) {
    this.tokens = capacity;
    this.updatedAt = now();
  }

  allow(): boolean {
    const timestamp = this.now();
    const elapsedMs = Math.max(0, timestamp - this.updatedAt);
    this.updatedAt = timestamp;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + (elapsedMs * this.refillPerSecond) / 1_000,
    );
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

export type BackpressureDecision = "send" | "skip" | "close";

export class OutboundBackpressure {
  private slowChecks = 0;

  constructor(
    private readonly maxBufferedBytes: number,
    private readonly maxSlowChecks: number,
  ) {}

  check(bufferedAmount: number): BackpressureDecision {
    if (bufferedAmount <= this.maxBufferedBytes) {
      this.slowChecks = 0;
      return "send";
    }
    this.slowChecks += 1;
    return this.slowChecks >= this.maxSlowChecks ? "close" : "skip";
  }
}
