type QueueTask<T> = () => Promise<T>;

interface QueueEntry<T> {
  key: string;
  task: QueueTask<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

/**
 * Fila serializada com deduplicação por chave.
 * Evita múltiplas chamadas simultâneas ao Supabase (ex.: get_user_cargo)
 * quando o token renova ou o AuthContext remonta.
 */
class AuthRequestQueue {
  private pending = new Map<string, Promise<unknown>>();
  private waiting: QueueEntry<unknown>[] = [];
  private running = false;

  enqueue<T>(key: string, task: QueueTask<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = new Promise<T>((resolve, reject) => {
      this.waiting.push({
        key,
        task: task as QueueTask<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      void this.drain();
    });

    this.pending.set(key, promise);
    promise.finally(() => {
      this.pending.delete(key);
    });

    return promise;
  }

  hasPending(key: string): boolean {
    return this.pending.has(key);
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;

    while (this.waiting.length > 0) {
      const entry = this.waiting.shift()!;
      try {
        const result = await entry.task();
        entry.resolve(result);
      } catch (error) {
        entry.reject(error);
      }
    }

    this.running = false;
  }
}

export const authRequestQueue = new AuthRequestQueue();
