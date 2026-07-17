type QueryResult<T = unknown> = {
  data: T;
  error: { message: string; code?: string; details?: string } | null;
  count?: number | null;
};

type FilterSpec = {
  method: string;
  args: unknown[];
};

type OrderSpec = {
  column: string;
  options?: { ascending?: boolean; referencedTable?: string };
};

type QuerySpec = {
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'rpc';
  table?: string;
  function?: string;
  params?: Record<string, unknown>;
  select?: string;
  selectOptions?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean };
  body?: unknown;
  returning?: string;
  upsertOptions?: { onConflict?: string; ignoreDuplicates?: boolean };
  filters?: FilterSpec[];
  orders?: OrderSpec[];
  limit?: number;
  range?: { from: number; to: number };
  single?: boolean;
  maybeSingle?: boolean;
};

type Session = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
    aud?: string;
    created_at?: string;
  };
};

type AuthListener = (event: string, session: Session | null) => void;

export type SupabaseProxyClientOptions = {
  apiBase?: string;
  storageKey?: string;
  extraHeaders?: () => Record<string, string>;
};

const DEFAULT_STORAGE_KEY = 'venuz-auth-session';

/** Monta URL legível no DevTools → Network (ex.: select/usuarios/saldo.single) */
function buildQueryPath(spec: QuerySpec): string {
  if (spec.operation === 'rpc') {
    const fn = spec.function ?? 'rpc';
    return `/rpc/${encodeURIComponent(fn)}`;
  }

  const table = encodeURIComponent(spec.table ?? 'unknown');
  const hints: string[] = [];

  if (spec.select && spec.select !== '*') {
    const firstCol = spec.select.split(',')[0]?.trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (firstCol) hints.push(firstCol);
  }
  if (spec.single) hints.push('single');
  else if (spec.maybeSingle) hints.push('one');
  if (spec.selectOptions?.head && spec.selectOptions?.count) hints.push('count');

  const suffix = hints.length > 0 ? `/${encodeURIComponent(hints.join('.'))}` : '';
  return `/${spec.operation}/${table}${suffix}`;
}

function getApiBase(options?: SupabaseProxyClientOptions): string {
  const fromEnv = import.meta.env.VITE_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (options?.apiBase) return options.apiBase.replace(/\/$/, '');
  return '/api/supabase';
}

class QueryBuilder<T = unknown> implements PromiseLike<QueryResult<T>> {
  private spec: QuerySpec;
  private readonly runQuery: (spec: QuerySpec) => Promise<QueryResult<unknown>>;

  constructor(spec: QuerySpec, runQuery: (spec: QuerySpec) => Promise<QueryResult<unknown>>) {
    this.spec = { ...spec, filters: spec.filters ? [...spec.filters] : [], orders: spec.orders ? [...spec.orders] : [] };
    this.runQuery = runQuery;
  }

  private clone(extra: Partial<QuerySpec> = {}): QueryBuilder<T> {
    return new QueryBuilder<T>(
      {
        ...this.spec,
        ...extra,
        filters: extra.filters ?? [...(this.spec.filters ?? [])],
        orders: extra.orders ?? [...(this.spec.orders ?? [])],
      },
      this.runQuery
    );
  }

  select(columns = '*', options?: QuerySpec['selectOptions']): QueryBuilder<T> {
    if (this.spec.operation === 'insert' || this.spec.operation === 'update' || this.spec.operation === 'delete' || this.spec.operation === 'upsert') {
      return this.clone({ returning: columns });
    }
    return this.clone({ select: columns, selectOptions: options });
  }

  insert(body: unknown): QueryBuilder<T> {
    return this.clone({ operation: 'insert', body });
  }

  update(body: unknown): QueryBuilder<T> {
    return this.clone({ operation: 'update', body });
  }

  delete(): QueryBuilder<T> {
    return this.clone({ operation: 'delete' });
  }

  upsert(body: unknown, upsertOptions?: QuerySpec['upsertOptions']): QueryBuilder<T> {
    return this.clone({ operation: 'upsert', body, upsertOptions });
  }

  eq(column: string, value: unknown): QueryBuilder<T> {
    return this.clone({ filters: [...(this.spec.filters ?? []), { method: 'eq', args: [column, value] }] });
  }

  neq(column: string, value: unknown): QueryBuilder<T> {
    return this.clone({ filters: [...(this.spec.filters ?? []), { method: 'neq', args: [column, value] }] });
  }

  in(column: string, values: unknown[]): QueryBuilder<T> {
    return this.clone({ filters: [...(this.spec.filters ?? []), { method: 'in', args: [column, values] }] });
  }

  ilike(column: string, pattern: string): QueryBuilder<T> {
    return this.clone({ filters: [...(this.spec.filters ?? []), { method: 'ilike', args: [column, pattern] }] });
  }

  gte(column: string, value: unknown): QueryBuilder<T> {
    return this.clone({ filters: [...(this.spec.filters ?? []), { method: 'gte', args: [column, value] }] });
  }

  lte(column: string, value: unknown): QueryBuilder<T> {
    return this.clone({ filters: [...(this.spec.filters ?? []), { method: 'lte', args: [column, value] }] });
  }

  gt(column: string, value: unknown): QueryBuilder<T> {
    return this.clone({ filters: [...(this.spec.filters ?? []), { method: 'gt', args: [column, value] }] });
  }

  lt(column: string, value: unknown): QueryBuilder<T> {
    return this.clone({ filters: [...(this.spec.filters ?? []), { method: 'lt', args: [column, value] }] });
  }

  not(column: string, operator: string, value: unknown): QueryBuilder<T> {
    return this.clone({ filters: [...(this.spec.filters ?? []), { method: 'not', args: [column, operator, value] }] });
  }

  order(column: string, options?: OrderSpec['options']): QueryBuilder<T> {
    return this.clone({ orders: [...(this.spec.orders ?? []), { column, options }] });
  }

  limit(count: number): QueryBuilder<T> {
    return this.clone({ limit: count });
  }

  range(from: number, to: number): QueryBuilder<T> {
    return this.clone({ range: { from, to } });
  }

  single(): QueryBuilder<T> {
    return this.clone({ single: true, maybeSingle: false });
  }

  maybeSingle(): QueryBuilder<T> {
    return this.clone({ maybeSingle: true, single: false });
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.runQuery(this.spec).then(onfulfilled, onrejected) as Promise<TResult1 | TResult2>;
  }
}

const POLL_INTERVAL_MS = 5000;

type RealtimeHandler = {
  channel: RealtimeChannel;
  config: Record<string, unknown>;
  callback: (payload: { new: Record<string, unknown>; old?: Record<string, unknown> }) => void;
};

type PollEntry = {
  pollKey: string;
  spec: QuerySpec;
  compareSnapshot: (result: QueryResult<unknown>) => string;
  buildPayload: (result: QueryResult<unknown>) => Record<string, unknown>;
  handlers: Set<RealtimeHandler>;
  lastSnapshot: string | undefined;
};

function buildPollEntry(config: Record<string, unknown>): PollEntry | null {
  const table = String(config.table ?? '');
  const filter = String(config.filter ?? '');
  const event = String(config.event ?? 'UPDATE');
  const eqMatch = filter.match(/^(\w+)=eq\.(.+)$/);
  if (!table || !eqMatch) return null;

  const filters: FilterSpec[] = [{ method: 'eq', args: [eqMatch[1], eqMatch[2]] }];
  const pollKey = `${event}:${table}:${filter}`;

  if (event === 'INSERT') {
    return {
      pollKey,
      spec: {
        operation: 'select',
        table,
        select: 'id',
        selectOptions: { count: 'exact', head: true },
        filters,
      },
      compareSnapshot: (result) => String(result.count ?? 0),
      buildPayload: () => ({}),
      handlers: new Set(),
      lastSnapshot: undefined,
    };
  }

  const select = table === 'usuarios' ? 'saldo' : '*';
  return {
    pollKey,
    spec: {
      operation: 'select',
      table,
      select,
      filters,
      maybeSingle: true,
    },
    compareSnapshot: (result) => JSON.stringify(result.data ?? null),
    buildPayload: (result) =>
      result.data && typeof result.data === 'object'
        ? (result.data as Record<string, unknown>)
        : {},
    handlers: new Set(),
    lastSnapshot: undefined,
  };
}

class RealtimeChannel {
  private readonly handlers: Array<{
    config: Record<string, unknown>;
    callback: (payload: { new: Record<string, unknown>; old?: Record<string, unknown> }) => void;
  }> = [];
  private subscribed = false;
  private readonly registerHandler: (handler: RealtimeHandler) => void;
  private readonly unregisterFromRegistry: (channel: RealtimeChannel) => void;

  constructor(
    _name: string,
    registerHandler: (handler: RealtimeHandler) => void,
    unregisterFromRegistry: (channel: RealtimeChannel) => void
  ) {
    this.registerHandler = registerHandler;
    this.unregisterFromRegistry = unregisterFromRegistry;
  }

  on(
    _event: 'postgres_changes',
    config: Record<string, unknown>,
    callback: (payload: { new: Record<string, unknown>; old?: Record<string, unknown> }) => void
  ): this {
    this.handlers.push({ config, callback });
    return this;
  }

  subscribe(): { unsubscribe: () => void } {
    if (this.subscribed) {
      return { unsubscribe: () => this.unsubscribe() };
    }

    this.subscribed = true;
    for (const handler of this.handlers) {
      this.registerHandler({ channel: this, ...handler });
    }

    return { unsubscribe: () => this.unsubscribe() };
  }

  unsubscribe(): void {
    if (!this.subscribed) return;
    this.subscribed = false;
    this.unregisterFromRegistry(this);
  }
}

export function createSupabaseProxyClient(options: SupabaseProxyClientOptions = {}) {
  const apiBase = getApiBase(options);
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const authListeners = new Set<AuthListener>();
  const inflightQueries = new Map<string, Promise<QueryResult<unknown>>>();
  const pollEntries = new Map<string, PollEntry>();
  let pollIntervalId: ReturnType<typeof setInterval> | null = null;
  let pollInFlight = false;

  function onVisibilityChange(): void {
    if (typeof document !== 'undefined' && !document.hidden) {
      void tickPoll();
    }
  }

  function stopPollerIfIdle(): void {
    if (pollEntries.size > 0 || !pollIntervalId) return;
    clearInterval(pollIntervalId);
    pollIntervalId = null;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  }

  function ensurePoller(): void {
    if (pollIntervalId) return;
    pollIntervalId = setInterval(() => void tickPoll(), POLL_INTERVAL_MS);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }
    void tickPoll();
  }

  async function tickPoll(): Promise<void> {
    if (pollInFlight || pollEntries.size === 0) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    pollInFlight = true;
    try {
      for (const entry of pollEntries.values()) {
        if (entry.handlers.size === 0) continue;

        const result = await runQuery(entry.spec);
        const snapshot = entry.compareSnapshot(result);

        if (entry.lastSnapshot !== undefined && entry.lastSnapshot !== snapshot) {
          const payload = entry.buildPayload(result);
          entry.handlers.forEach((handler) => {
            try {
              handler.callback({ new: payload });
            } catch (err) {
              console.error('[supabase-proxy] realtime callback error:', err);
            }
          });
        }

        entry.lastSnapshot = snapshot;
      }
    } finally {
      pollInFlight = false;
    }
  }

  function addRealtimeHandler(handler: RealtimeHandler): void {
    const built = buildPollEntry(handler.config);
    if (!built) return;

    let entry = pollEntries.get(built.pollKey);
    if (!entry) {
      pollEntries.set(built.pollKey, built);
      entry = built;
    }

    entry.handlers.add(handler);
    ensurePoller();
  }

  function removeRealtimeChannel(channel: RealtimeChannel): void {
    for (const [pollKey, entry] of pollEntries.entries()) {
      for (const handler of [...entry.handlers]) {
        if (handler.channel === channel) {
          entry.handlers.delete(handler);
        }
      }
      if (entry.handlers.size === 0) {
        pollEntries.delete(pollKey);
      }
    }
    stopPollerIfIdle();
  }

  function readSession(): Session | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }

  function writeSession(session: Session | null): void {
    if (typeof window === 'undefined') return;
    if (!session) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(session));
  }

  function notifyAuth(event: string, session: Session | null): void {
    authListeners.forEach((listener) => {
      try {
        listener(event, session);
      } catch (err) {
        console.error('[supabase-proxy] auth listener error:', err);
      }
    });
  }

  async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');

    const session = readSession();
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }

    const extra = options.extraHeaders?.();
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        if (value) headers.set(key, value);
      });
    }

    return fetch(`${apiBase}${path}`, {
      ...init,
      headers,
    });
  }

  async function runQuery(spec: QuerySpec): Promise<QueryResult<unknown>> {
    const cacheKey = JSON.stringify(spec);
    const inflight = inflightQueries.get(cacheKey);
    if (inflight) return inflight;

    const promise = (async () => {
      const path = buildQueryPath(spec);
      const response = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(
          spec.operation === 'rpc' ? { params: spec.params ?? {} } : { query: spec }
        ),
      });

      if (response.status === 401) {
        writeSession(null);
        notifyAuth('SIGNED_OUT', null);
      }

      const payload = await response.json();
      return {
        data: payload.data ?? null,
        error: payload.error ?? null,
        count: payload.count ?? null,
      };
    })();

    inflightQueries.set(cacheKey, promise);

    try {
      return await promise;
    } finally {
      inflightQueries.delete(cacheKey);
    }
  }

  const auth = {
    /** Lê sessão do localStorage — sem requisição de rede (igual ao SDK Supabase). */
    async getSession(): Promise<{ data: { session: Session | null }; error: null | { message: string } }> {
      return { data: { session: readSession() }, error: null };
    },

    /** Valida token no servidor — use só quando precisar confirmar sessão remotamente. */
    async validateSession(): Promise<{ data: { session: Session | null }; error: null | { message: string } }> {
      const local = readSession();
      if (!local?.access_token) {
        return { data: { session: null }, error: null };
      }

      const response = await apiFetch('/auth/session');
      const payload = await response.json();

      if (payload.error || !payload.data?.session) {
        writeSession(null);
        notifyAuth('SIGNED_OUT', null);
        return { data: { session: null }, error: payload.error ?? null };
      }

      const merged: Session = {
        ...local,
        ...payload.data.session,
        user: payload.data.session.user ?? local.user,
      };
      writeSession(merged);
      return { data: { session: merged }, error: null };
    },

    async signInWithPassword(params: { email: string; password: string }) {
      const response = await apiFetch('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      const payload = await response.json();

      if (payload.error) {
        return { data: { user: null, session: null }, error: payload.error };
      }

      if (payload.data?.session) {
        writeSession(payload.data.session);
        notifyAuth('SIGNED_IN', payload.data.session);
      }

      return { data: payload.data ?? { user: null, session: null }, error: null };
    },

    async signUp(params: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
      const response = await apiFetch('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      const payload = await response.json();

      if (payload.error) {
        return { data: { user: null, session: null }, error: payload.error };
      }

      if (payload.data?.session) {
        writeSession(payload.data.session);
        notifyAuth('SIGNED_IN', payload.data.session);
      }

      return { data: payload.data ?? { user: null, session: null }, error: null };
    },

    async signOut() {
      await apiFetch('/auth/sign-out', { method: 'POST' });
      writeSession(null);
      notifyAuth('SIGNED_OUT', null);
      return { error: null };
    },

    onAuthStateChange(callback: AuthListener) {
      authListeners.add(callback);
      callback('INITIAL_SESSION', readSession());

      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },

    admin: {
      async updateUserById(userId: string, attributes: Record<string, unknown>) {
        const response = await apiFetch('/auth/admin/update-user', {
          method: 'POST',
          body: JSON.stringify({ userId, attributes }),
        });
        const payload = await response.json();
        return { data: payload.data ?? null, error: payload.error ?? null };
      },
    },
  };

  return {
    auth,
    from(table: string) {
      return new QueryBuilder({ operation: 'select', table }, runQuery);
    },
    rpc(functionName: string, params?: Record<string, unknown>) {
      return new QueryBuilder(
        { operation: 'rpc', function: functionName, params: params ?? {} },
        runQuery
      );
    },
    channel(name: string) {
      return new RealtimeChannel(name, addRealtimeHandler, removeRealtimeChannel);
    },
    removeChannel(channel: RealtimeChannel) {
      channel.unsubscribe();
    },
  };
}

export type SupabaseProxyClient = ReturnType<typeof createSupabaseProxyClient>;
