/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {import('express').Request} req
 */
export async function getAuthUser(supabase, req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  return { user: data.user, token };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function requireAuthUser(supabase, req, res) {
  const auth = await getAuthUser(supabase, req);
  if (!auth) {
    res.status(401).json({ ok: false, message: 'Não autenticado' });
    return null;
  }
  return auth;
}

/**
 * Exige JWT cujo email coincide com user_code (case-insensitive).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function requireMatchingUserCode(supabase, req, res) {
  const auth = await requireAuthUser(supabase, req, res);
  if (!auth) return null;

  const userCode = String(
    req.body?.user_code ?? req.query?.user_code ?? ''
  ).trim();

  if (!userCode) {
    res.status(400).json({ ok: false, status: false, msg: 'Campo obrigatório: user_code' });
    return null;
  }

  const sessionEmail = String(auth.user.email || '').trim().toLowerCase();
  if (sessionEmail !== userCode.toLowerCase()) {
    res.status(403).json({ ok: false, status: false, msg: 'Acesso negado para este usuário' });
    return null;
  }

  return auth;
}
