type QueueTask<T> = () => Promise<T>;

interface QueueEntry<T> {
  task: QueueTask<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function getQueueConcurrency(): number {
  const raw = import.meta.env.VITE_PLAYFIVERS_QUEUE_CONCURRENCY?.trim();
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function getQueueIntervalMs(): number {
  const raw = import.meta.env.VITE_PLAYFIVERS_QUEUE_INTERVAL_MS?.trim();
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 400;
}

/**
 * Fila com limite de concorrência e intervalo mínimo entre inícios de requisição.
 * Evita rate limiting (429) da API PlayFivers.
 */
class PlayFiversRequestQueue {
  private readonly concurrency: number;
  private readonly intervalMs: number;
  private running = 0;
  private lastStart = 0;
  private readonly waiting: QueueEntry<unknown>[] = [];

  constructor(concurrency = 1, intervalMs = 400) {
    this.concurrency = concurrency;
    this.intervalMs = intervalMs;
  }

  get pendingCount(): number {
    return this.waiting.length;
  }

  get activeCount(): number {
    return this.running;
  }

  add<T>(task: QueueTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.waiting.push({
        task: task as QueueTask<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      void this.pump();
    });
  }

  private async pump(): Promise<void> {
    while (this.running < this.concurrency && this.waiting.length > 0) {
      const now = Date.now();
      const waitMs = this.lastStart + this.intervalMs - now;
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      const entry = this.waiting.shift();
      if (!entry) return;

      this.running += 1;
      this.lastStart = Date.now();

      void this.runEntry(entry);
    }
  }

  private async runEntry(entry: QueueEntry<unknown>): Promise<void> {
    try {
      const result = await entry.task();
      entry.resolve(result);
    } catch (error) {
      entry.reject(error);
    } finally {
      this.running -= 1;
      void this.pump();
    }
  }
}

export const playFiversRequestQueue = new PlayFiversRequestQueue(
  getQueueConcurrency(),
  getQueueIntervalMs()
);

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRateLimitRetry(
  url: string,
  init?: RequestInit,
  maxRetries = 4
): Promise<Response> {
  let attempt = 0;

  while (true) {
    const res = await fetch(url, init);

    if (res.status !== 429 && res.status !== 503) {
      return res;
    }

    if (attempt >= maxRetries) {
      return res;
    }

    const retryAfterHeader = res.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const backoffMs = Number.isFinite(retryAfterSeconds)
      ? Math.max(retryAfterSeconds * 1000, 500)
      : Math.min(1000 * 2 ** attempt, 8000);

    attempt += 1;
    await sleep(backoffMs);
  }
}
