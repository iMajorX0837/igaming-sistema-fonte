/** Bloqueios de segurança no proxy Supabase (usuários autenticados). */

export const BLOCKED_USER_RPCS = new Set([
  'confirmar_deposito_pix_pago',
  'confirmar_deposito_pix_pago_server',
  'processar_recompensa_indicacao',
  'atualizar_saldo_usuario',
  'subtrair_saldo_saque',
  'obter_aviator_engine_config',
  'calcular_aviator_ggr',
]);

/** RPCs permitidas sem JWT (allowlist anon). */
export const PUBLIC_ANON_RPCS = new Set(['obter_config_plataforma', 'obter_roleta_config']);

/**
 * SELECT público sem JWT — espelha GRANT SELECT TO anon + RLS USING (true|ativo).
 * Catálogo/CMS da home; não inclui usuarios, financeiro nem secrets.
 */
export const PUBLIC_ANON_SELECT_TABLES = new Set([
  'cms_items',
  'site_config',
  'tracking_pixels',
  'vip_niveis',
  'home_sections',
  'home_section_games',
  'home_section_providers',
  'platform_providers',
  'platform_games',
  'all_games_page_config',
  'all_games_providers',
  'all_games_categories',
]);

/** Operações bloqueadas por tabela (anon + user; admin elevado bypass exceto BLOCKED_PROXY_TABLES). */
export const BLOCKED_USER_TABLE_OPS = {
  depositos: new Set(['insert', 'upsert', 'update', 'delete']),
  saques: new Set(['insert', 'upsert', 'update', 'delete']),
  integration_secrets: new Set(['select', 'insert', 'upsert', 'update', 'delete']),
  aviator_rounds: new Set(['insert', 'upsert', 'update', 'delete']),
  aviator_bets: new Set(['insert', 'upsert', 'update', 'delete']),
  aviator_velas: new Set(['insert', 'upsert', 'update', 'delete']),
  transacoes_jogos: new Set(['insert', 'upsert', 'update', 'delete']),
  usuarios: new Set(['update', 'upsert']),
  aviator_config: new Set(['insert', 'upsert', 'update', 'delete']),
  admin_logs: new Set(['insert', 'upsert', 'update', 'delete']),
  webhook_deliveries: new Set(['insert', 'upsert', 'update', 'delete']),
  tracking_pixels: new Set(['insert', 'upsert', 'update', 'delete']),
};

/** Tabelas que não podem ser acessadas via proxy (nem admin) — usar API dedicada. */
export const BLOCKED_PROXY_TABLES = new Set(['webhooks']);

const ADMIN_ONLY_RPCS = new Set([
  'registrar_admin_log',
  'listar_membros_equipe',
  'adicionar_membro_equipe',
  'atualizar_membro_equipe',
  'remover_membro_equipe',
]);

/**
 * RPCs administrativas — exigem sessão elevada se 2FA ativo.
 * @param {string | undefined} rpcName
 */
export function isAdminOnlyRpcName(rpcName) {
  if (!rpcName || typeof rpcName !== 'string') return false;
  const lower = rpcName.toLowerCase();
  if (ADMIN_ONLY_RPCS.has(lower)) return true;
  return /_admin\b/i.test(rpcName) || lower.endsWith('_admin');
}

/**
 * @param {string | undefined} table
 * @param {string | undefined} operation
 */
export function isBlockedUserTableWrite(table, operation) {
  if (!table || !operation) return false;
  const normalized = table.toLowerCase();
  if (BLOCKED_PROXY_TABLES.has(normalized)) return true;
  const blocked = BLOCKED_USER_TABLE_OPS[normalized];
  return blocked?.has(operation.toLowerCase()) ?? false;
}

/**
 * @param {object} spec
 */
export function getQueryTableAndOperation(spec) {
  if (!spec || typeof spec !== 'object') {
    return { table: null, operation: null };
  }

  if (spec.operation === 'rpc') {
    return { table: null, operation: 'rpc', rpc: spec.function };
  }

  return {
    table: typeof spec.table === 'string' ? spec.table : null,
    operation: typeof spec.operation === 'string' ? spec.operation : null,
  };
}

/** Campos permitidos em POST /auth/admin/update-user (M7 — anti mass assignment). */
export const ADMIN_UPDATE_USER_ALLOWED = new Set(['password']);

/**
 * @param {unknown} raw
 * @returns {{ ok: true; attributes: { password: string } } | { ok: false; error: string; rejected?: string[] }}
 */
export function sanitizeAdminUpdateUserAttributes(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'attributes inválido' };
  }

  const keys = Object.keys(raw);
  if (keys.length === 0) {
    return { ok: false, error: 'Nenhum campo em attributes' };
  }

  const rejected = keys.filter((key) => !ADMIN_UPDATE_USER_ALLOWED.has(key));
  if (rejected.length > 0) {
    return {
      ok: false,
      error: `Campos não permitidos: ${rejected.join(', ')}`,
      rejected,
    };
  }

  const password = raw.password;
  if (typeof password !== 'string' || password.trim().length < 6) {
    return { ok: false, error: 'password deve ter pelo menos 6 caracteres' };
  }

  return { ok: true, attributes: { password: password.trim() } };
}
