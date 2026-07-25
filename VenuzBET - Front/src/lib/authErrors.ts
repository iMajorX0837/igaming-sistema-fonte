type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
} | null | undefined;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Converte erros do Supabase Auth / proxy em mensagens claras em PT-BR.
 */
export function mapAuthError(
  error: AuthErrorLike | string | Error | unknown,
  fallback: string
): string {
  if (!error) return fallback;

  if (typeof error === 'string') {
    return mapAuthErrorText(error, undefined, undefined, fallback);
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as AuthErrorLike)?.message ?? '')
        : '';

  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as AuthErrorLike)?.code ?? '')
      : '';

  const status =
    typeof error === 'object' && error && 'status' in error
      ? Number((error as AuthErrorLike)?.status)
      : undefined;

  return mapAuthErrorText(message, code, status, fallback);
}

function mapAuthErrorText(
  message: string,
  code: string | undefined,
  status: number | undefined,
  fallback: string
): string {
  const msg = normalize(message || '');
  const errCode = normalize(code || '');

  if (errCode === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'Senha inválida. Verifique seus dados e tente novamente.';
  }

  if (errCode === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de fazer login.';
  }

  if (
    errCode === 'user_already_exists' ||
    msg.includes('user already registered') ||
    msg.includes('already been registered') ||
    msg.includes('email address is already registered')
  ) {
    return 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.';
  }

  if (
    errCode === 'weak_password' ||
    msg.includes('password should be at least') ||
    msg.includes('password is known to be weak') ||
    msg.includes('password is too weak')
  ) {
    if (msg.includes('at least')) {
      const match = message.match(/at least (\d+)/i);
      const min = match?.[1] ?? '6';
      return `A senha deve ter pelo menos ${min} caracteres.`;
    }
    return 'Senha muito fraca. Use uma combinação mais segura.';
  }

  if (
    errCode === 'validation_failed' ||
    msg.includes('unable to validate email') ||
    msg.includes('invalid email') ||
    (msg.includes('email address') && msg.includes('invalid'))
  ) {
    return 'E-mail inválido. Verifique o endereço digitado.';
  }

  if (
    errCode === 'over_request_rate_limit' ||
    errCode === 'over_email_send_rate_limit' ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('muitas requisições')
  ) {
    return 'Muitas tentativas. Aguarde um momento e tente novamente.';
  }

  if (errCode === 'signup_disabled' || msg.includes('signups not allowed')) {
    return 'Cadastros temporariamente desativados. Tente mais tarde.';
  }

  if (
    errCode === 'user_banned' ||
    msg.includes('user is banned') ||
    msg.includes('user banned')
  ) {
    return 'Esta conta foi bloqueada. Entre em contato com o suporte.';
  }

  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Falha de conexão. Verifique sua internet e tente novamente.';
  }

  if (msg.includes('cpf') && (msg.includes('already') || msg.includes('já') || msg.includes('duplicate') || msg.includes('unique'))) {
    return 'Este CPF já está cadastrado. Faça login ou recupere sua conta.';
  }

  if (msg.includes('phone') && (msg.includes('already') || msg.includes('duplicate') || msg.includes('unique'))) {
    return 'Este telefone já está cadastrado. Use outro número ou faça login.';
  }

  if (status === 429) {
    return 'Muitas tentativas. Aguarde um momento e tente novamente.';
  }

  // Mensagens já em português (proxy / validações locais)
  if (message && /[áàâãéêíóôõúç]|obrigat|inválid|senha|e-mail|email|conta|cadastro|tente/i.test(message)) {
    return message;
  }

  if (message && !looksLikeEnglishAuthError(msg)) {
    return message;
  }

  return fallback;
}

function looksLikeEnglishAuthError(msg: string): boolean {
  return (
    msg.includes('invalid') ||
    msg.includes('credentials') ||
    msg.includes('password') ||
    msg.includes('email') ||
    msg.includes('user') ||
    msg.includes('signup') ||
    msg.includes('sign up') ||
    msg.includes('login') ||
    msg.includes('registered') ||
    msg.includes('rate limit') ||
    msg.includes('banned') ||
    msg.includes('confirm')
  );
}

export function getAuthErrorMessage(err: unknown, fallback: string): string {
  return mapAuthError(err, fallback);
}
