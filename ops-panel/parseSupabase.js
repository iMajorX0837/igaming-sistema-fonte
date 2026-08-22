/**
 * Parseia colagem do Supabase: URI postgres + keys opcionais.
 */

function decodePart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parsePostgresUri(uri) {
  const trimmed = uri.trim();
  const match = trimmed.match(/^postgres(?:ql)?:\/\//i);
  if (!match) {
    throw new Error('Connection string inválida (deve começar com postgresql://)');
  }

  const rest = trimmed.slice(match[0].length);
  const atIdx = rest.lastIndexOf('@');
  if (atIdx <= 0) {
    throw new Error('Connection string inválida (faltando @host)');
  }

  const creds = rest.slice(0, atIdx);
  const hostPart = rest.slice(atIdx + 1);
  const colonIdx = creds.indexOf(':');
  if (colonIdx <= 0) {
    throw new Error('Connection string inválida (faltando usuário:senha)');
  }

  const user = decodePart(creds.slice(0, colonIdx));
  const password = decodePart(creds.slice(colonIdx + 1));

  let hostPortDb = hostPart.split('?')[0];
  let database = 'postgres';
  const slashIdx = hostPortDb.indexOf('/');
  if (slashIdx >= 0) {
    database = hostPortDb.slice(slashIdx + 1) || 'postgres';
    hostPortDb = hostPortDb.slice(0, slashIdx);
  }

  const portColon = hostPortDb.lastIndexOf(':');
  let host = hostPortDb;
  let port = '5432';
  if (portColon > 0) {
    host = hostPortDb.slice(0, portColon);
    port = hostPortDb.slice(portColon + 1) || '5432';
  }

  if (!host) {
    throw new Error('Connection string inválida (host ausente)');
  }

  return { user, password, host, port, database };
}

function projectRefFromUser(user) {
  if (user.startsWith('postgres.')) {
    return user.slice('postgres.'.length);
  }
  return null;
}

function parseSupabasePaste(raw) {
  const text = String(raw || '').trim();
  if (!text) {
    throw Object.assign(new Error('Cole a connection string do Supabase'), { status: 400 });
  }

  let supabaseUrl = '';
  let supabaseAnonKey = '';
  let supabaseServiceKey = '';

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const kv = trimmed.match(/^SUPABASE_(URL|ANON_KEY|SERVICE_KEY)\s*=\s*(.+)$/i);
    if (kv) {
      const val = kv[2].trim().replace(/^["']|["']$/g, '');
      if (kv[1].toUpperCase() === 'URL') supabaseUrl = val;
      if (kv[1].toUpperCase() === 'ANON_KEY') supabaseAnonKey = val;
      if (kv[1].toUpperCase() === 'SERVICE_KEY') supabaseServiceKey = val;
    }
  }

  const uriMatch = text.match(/postgres(?:ql)?:\/\/[^\s'"<>]+/i);
  if (!uriMatch) {
    throw Object.assign(new Error('Não encontrei postgresql:// na colagem'), { status: 400 });
  }

  const pg = parsePostgresUri(uriMatch[0]);
  const projectRef = projectRefFromUser(pg.user);

  if (!supabaseUrl && projectRef) {
    supabaseUrl = `https://${projectRef}.supabase.co`;
  }

  return {
    postgres: pg,
    projectRef,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey,
  };
}

function validateNewTenantInput(body) {
  const slug = String(body.slug || '')
    .trim()
    .toLowerCase();
  const domain = String(body.domain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  const label = String(body.label || '').trim();
  const paste = body.supabasePaste || body.postgresUri || body.connectionString || '';

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw Object.assign(new Error('Slug inválido (use a-z, 0-9, hífen)'), { status: 400 });
  }
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    throw Object.assign(new Error('Domínio inválido (ex: bandpiix.com)'), { status: 400 });
  }
  if (!label) {
    throw Object.assign(new Error('Nome da casa é obrigatório'), { status: 400 });
  }

  const parsed = parseSupabasePaste(paste);

  if (!parsed.supabaseUrl.startsWith('https://') || !parsed.supabaseUrl.includes('supabase')) {
    throw Object.assign(new Error('Não foi possível derivar SUPABASE_URL — use usuário postgres.PROJECT_REF'), {
      status: 400,
    });
  }
  if (parsed.supabaseAnonKey.length < 20) {
    throw Object.assign(
      new Error('Adicione SUPABASE_ANON_KEY= na colagem (Supabase → Settings → API)'),
      { status: 400 }
    );
  }
  if (parsed.supabaseServiceKey.length < 20) {
    throw Object.assign(
      new Error('Adicione SUPABASE_SERVICE_KEY= na colagem (Supabase → Settings → API)'),
      { status: 400 }
    );
  }

  return {
    slug,
    domain,
    label,
    deploy: true,
    ...parsed,
  };
}

module.exports = {
  parseSupabasePaste,
  parsePostgresUri,
  validateNewTenantInput,
};
