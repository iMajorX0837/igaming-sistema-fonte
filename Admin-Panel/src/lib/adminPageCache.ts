/**
 * Cache em memória para dados de listagens/dashboard do admin.
 * Evita refetch ao voltar para uma rota na mesma sessão (até logout ou invalidação).
 */
const store = new Map<string, unknown>();

export const adminPageCache = {
  get<T>(key: string): T | undefined {
    return store.get(key) as T | undefined;
  },

  set(key: string, value: unknown) {
    store.set(key, value);
  },

  invalidatePrefix(prefix: string) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) {
        store.delete(key);
      }
    }
  },

  clear() {
    store.clear();
  },
};
