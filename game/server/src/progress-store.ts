export class BoundedProgressStore<Value> {
  private readonly entries = new Map<string, { value: Value; expiresAt: number }>();

  constructor(
    private readonly capacity = 10_000,
    private readonly ttlMs = 24 * 60 * 60 * 1_000,
    private readonly now: () => number = Date.now,
  ) {}

  get size(): number {
    this.pruneExpired();
    return this.entries.size;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  get(key: string): Value | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: Value): void {
    this.pruneExpired();
    this.entries.delete(key);
    while (this.entries.size >= this.capacity) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  private pruneExpired(): void {
    const timestamp = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= timestamp) this.entries.delete(key);
    }
  }
}
