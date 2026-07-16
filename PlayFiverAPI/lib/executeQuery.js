/**
 * Executa uma query serializada contra o cliente Supabase.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {object} spec
 */
export async function executeQuery(client, spec) {
  if (spec.operation === 'rpc') {
    return client.rpc(spec.function, spec.params ?? {});
  }

  let query = client.from(spec.table);

  switch (spec.operation) {
    case 'select':
      query = query.select(spec.select ?? '*', spec.selectOptions ?? undefined);
      break;
    case 'insert':
      query = query.insert(spec.body);
      if (spec.returning) {
        query = query.select(spec.returning);
      }
      break;
    case 'update':
      query = query.update(spec.body);
      if (spec.returning) {
        query = query.select(spec.returning);
      }
      break;
    case 'delete':
      query = query.delete();
      if (spec.returning) {
        query = query.select(spec.returning);
      }
      break;
    case 'upsert':
      query = query.upsert(spec.body, spec.upsertOptions ?? undefined);
      if (spec.returning) {
        query = query.select(spec.returning);
      }
      break;
    default:
      throw new Error(`Operação não suportada: ${spec.operation}`);
  }

  for (const filter of spec.filters ?? []) {
    const method = query[filter.method];
    if (typeof method !== 'function') {
      throw new Error(`Filtro não suportado: ${filter.method}`);
    }
    query = method.apply(query, filter.args);
  }

  for (const order of spec.orders ?? []) {
    query = query.order(order.column, order.options ?? undefined);
  }

  if (spec.limit != null) {
    query = query.limit(spec.limit);
  }

  if (spec.single) {
    query = query.single();
  } else if (spec.maybeSingle) {
    query = query.maybeSingle();
  }

  return query;
}
