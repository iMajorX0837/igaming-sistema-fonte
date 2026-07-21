/** Bloqueios de segurança no proxy Supabase (usuários autenticados). */

export const BLOCKED_USER_RPCS = new Set([
  'confirmar_deposito_pix_pago',
  'confirmar_deposito_pix_pago_server',
  'atualizar_saldo_usuario',
]);

/** Operações de escrita bloqueadas por tabela para tokens de usuário comum. */
export const BLOCKED_USER_TABLE_OPS = {
  depositos: new Set(['insert', 'upsert', 'update', 'delete']),
  integration_secrets: new Set(['select', 'insert', 'upsert', 'update', 'delete']),
};

/**
 * @param {string | undefined} table
 * @param {string | undefined} operation
 */
export function isBlockedUserTableWrite(table, operation) {
  if (!table || !operation) return false;
  const blocked = BLOCKED_USER_TABLE_OPS[table.toLowerCase()];
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
