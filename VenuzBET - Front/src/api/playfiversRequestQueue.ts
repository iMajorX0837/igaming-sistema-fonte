/** Fila simples: limita requisições simultâneas à API PlayFivers e espaça o início de cada uma. */
class PlayFiversRequestQueue {
  private readonly concurrency: number;
  private readonly intervalMs: number;
  private running = 0;
  private lastStart = 0;
  private readonly pending: Array<{
    run: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = [];

  constructor(concurrency = 2, intervalMs = 300) {
    this.concurrency = concurrency;
    this.intervalMs = intervalMs;
  }

  add<T>(run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.push({
        run: run as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      void this.drain();
    });
  }

  private async drain(): Promise<void> {
    if (this.running >= this.concurrency || this.pending.length === 0) {
      return;
    }

    const now = Date.now();
    const waitMs = this.lastStart + this.intervalMs - now;
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const item = this.pending.shift();
    if (!item) return;

    this.running += 1;
    this.lastStart = Date.now();

    try {
      const result = await item.run();
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    } finally {
      this.running -= 1;
      void this.drain();
    }
  }
}

export const playFiversRequestQueue = new PlayFiversRequestQueue(2, 300);
