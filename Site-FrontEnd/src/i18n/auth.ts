import type { CopyByLanguage } from './types';

export type AuthCopy = {
  email: string;
  password: string;
  passwordPlaceholder: string;
  forgotPassword: string;
  login: string;
  loginAlt: string;
  loggingIn: string;
  orLoginWith: string;
  noAccount: string;
  createFreeAccount: string;
  loginFallbackError: string;
  emailPasswordRequired: string;
  emailRequired: string;
  passwordRequired: string;
  invalidEmail: string;
  passwordMinLength: string;
  register: string;
  registering: string;
  registerUpper: string;
  orRegisterWith: string;
  hasAccount: string;
  loginHere: string;
  fullName: string;
  cpf: string;
  phone: string;
  confirmPassword: string;
  termsPrefix: string;
  termsLink: string;
  privacyLink: string;
  termsSuffix: string;
  termsRequired: string;
  validEmailRequired: string;
  invalidPhone: string;
  registerFallbackError: string;
  cancelRegistration: string;
  cancelRegistrationMessage: string;
  continueRegistration: string;
  cancel: string;
  consultingCpf: string;
  cpfInvalid: string;
  cpfAlreadyRegistered: string;
  cpfNotFound: string;
  cpfValidationError: string;
  passwordsMismatch: string;
  // auth errors
  invalidCredentials: string;
  emailNotConfirmed: string;
  userAlreadyExists: string;
  weakPassword: string;
  weakPasswordMin: (min: string) => string;
  validationFailed: string;
  rateLimit: string;
  signupDisabled: string;
  userBanned: string;
  networkError: string;
  cpfDuplicate: string;
  phoneDuplicate: string;
};

export const AUTH_COPY: CopyByLanguage<AuthCopy> = {
  pt: {
    email: 'E-mail',
    password: 'Senha',
    passwordPlaceholder: 'Digite sua senha',
    forgotPassword: 'Esqueci a senha',
    login: 'ENTRAR',
    loginAlt: 'Login',
    loggingIn: 'Entrando...',
    orLoginWith: 'Ou entre com',
    noAccount: 'Ainda não tem uma conta?',
    createFreeAccount: 'Criar uma conta grátis',
    loginFallbackError: 'Não foi possível fazer login. Tente novamente.',
    emailPasswordRequired: 'Informe seu e-mail e senha para continuar.',
    emailRequired: 'Informe o e-mail da sua conta.',
    passwordRequired: 'Informe sua senha.',
    invalidEmail: 'E-mail inválido. Verifique o endereço digitado.',
    passwordMinLength: 'A senha deve ter pelo menos 6 caracteres.',
    register: 'Cadastre-se',
    registering: 'Criando conta...',
    registerUpper: 'CADASTRE-SE',
    orRegisterWith: 'Ou cadastre-se com',
    hasAccount: 'Já tem uma conta?',
    loginHere: 'Faça login aqui',
    fullName: 'Nome completo',
    cpf: 'CPF',
    phone: 'Telefone',
    confirmPassword: 'Confirmar senha',
    termsPrefix: 'Confirmo que ',
    termsLink: 'tenho mais de 18 anos',
    privacyLink: 'Política de Privacidade',
    termsSuffix: ' e aceito os Termos & Condições.',
    termsRequired: 'Você precisa aceitar os termos e condições para continuar.',
    validEmailRequired: 'Informe um e-mail válido para criar sua conta.',
    invalidPhone: 'Telefone inválido. Use DDD + número (10 ou 11 dígitos).',
    registerFallbackError: 'Não foi possível criar sua conta. Tente novamente.',
    cancelRegistration: 'Tem certeza que deseja cancelar seu registro?',
    cancelRegistrationMessage: 'Cadastre-se agora para concorrer a bônus exclusivos e rodadas grátis imperdíveis!',
    continueRegistration: 'Continuar cadastro',
    cancel: 'Cancelar',
    consultingCpf: 'Consultando...',
    cpfInvalid: 'CPF inválido.',
    cpfAlreadyRegistered: 'Este CPF já está cadastrado. Faça login ou recupere sua conta.',
    cpfNotFound: 'CPF não encontrado ou inválido.',
    cpfValidationError: 'Não foi possível validar o CPF. Tente novamente.',
    passwordsMismatch: 'As senhas não coincidem.',
    invalidCredentials: 'Senha inválida. Verifique seus dados e tente novamente.',
    emailNotConfirmed: 'Confirme seu e-mail antes de fazer login.',
    userAlreadyExists: 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.',
    weakPassword: 'Senha muito fraca. Use uma combinação mais segura.',
    weakPasswordMin: (min) => `A senha deve ter pelo menos ${min} caracteres.`,
    validationFailed: 'E-mail inválido. Verifique o endereço digitado.',
    rateLimit: 'Muitas tentativas. Aguarde um momento e tente novamente.',
    signupDisabled: 'Cadastros temporariamente desativados. Tente mais tarde.',
    userBanned: 'Esta conta foi bloqueada. Entre em contato com o suporte.',
    networkError: 'Falha de conexão. Verifique sua internet e tente novamente.',
    cpfDuplicate: 'Este CPF já está cadastrado. Faça login ou recupere sua conta.',
    phoneDuplicate: 'Este telefone já está cadastrado. Use outro número ou faça login.',
  },
  en: {
    email: 'Email',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    forgotPassword: 'Forgot password',
    login: 'SIGN IN',
    loginAlt: 'Login',
    loggingIn: 'Signing in...',
    orLoginWith: 'Or sign in with',
    noAccount: "Don't have an account yet?",
    createFreeAccount: 'Create a free account',
    loginFallbackError: 'Could not sign in. Please try again.',
    emailPasswordRequired: 'Enter your email and password to continue.',
    emailRequired: 'Enter your account email.',
    passwordRequired: 'Enter your password.',
    invalidEmail: 'Invalid email. Check the address you entered.',
    passwordMinLength: 'Password must be at least 6 characters.',
    register: 'Sign up',
    registering: 'Creating account...',
    registerUpper: 'SIGN UP',
    orRegisterWith: 'Or sign up with',
    hasAccount: 'Already have an account?',
    loginHere: 'Sign in here',
    fullName: 'Full name',
    cpf: 'CPF',
    phone: 'Phone',
    confirmPassword: 'Confirm password',
    termsPrefix: 'I confirm that I ',
    termsLink: 'am over 18 years old',
    privacyLink: 'Privacy Policy',
    termsSuffix: ' and accept the Terms & Conditions.',
    termsRequired: 'You must accept the terms and conditions to continue.',
    validEmailRequired: 'Enter a valid email to create your account.',
    invalidPhone: 'Invalid phone. Use area code + number (10 or 11 digits).',
    registerFallbackError: 'Could not create your account. Please try again.',
    cancelRegistration: 'Cancel registration?',
    cancelRegistrationMessage: 'The information you entered will be lost.',
    continueRegistration: 'Continue registration',
    cancel: 'Cancel',
    consultingCpf: 'Checking...',
    cpfInvalid: 'Invalid CPF.',
    cpfAlreadyRegistered: 'This CPF is already registered. Sign in or recover your account.',
    cpfNotFound: 'CPF not found or invalid.',
    cpfValidationError: 'Could not validate CPF. Please try again.',
    passwordsMismatch: 'Passwords do not match.',
    invalidCredentials: 'Invalid password. Check your details and try again.',
    emailNotConfirmed: 'Confirm your email before signing in.',
    userAlreadyExists: 'This email is already registered. Sign in or use another email.',
    weakPassword: 'Password too weak. Use a stronger combination.',
    weakPasswordMin: (min) => `Password must be at least ${min} characters.`,
    validationFailed: 'Invalid email. Check the address you entered.',
    rateLimit: 'Too many attempts. Wait a moment and try again.',
    signupDisabled: 'Registrations temporarily disabled. Try again later.',
    userBanned: 'This account has been blocked. Contact support.',
    networkError: 'Connection failed. Check your internet and try again.',
    cpfDuplicate: 'This CPF is already registered. Sign in or recover your account.',
    phoneDuplicate: 'This phone is already registered. Use another number or sign in.',
  },
  es: {
    email: 'Correo electrónico',
    password: 'Contraseña',
    passwordPlaceholder: 'Ingresa tu contraseña',
    forgotPassword: 'Olvidé mi contraseña',
    login: 'ENTRAR',
    loginAlt: 'Inicio de sesión',
    loggingIn: 'Entrando...',
    orLoginWith: 'O entra con',
    noAccount: '¿Aún no tienes una cuenta?',
    createFreeAccount: 'Crear una cuenta gratis',
    loginFallbackError: 'No fue posible iniciar sesión. Inténtalo de nuevo.',
    emailPasswordRequired: 'Ingresa tu correo y contraseña para continuar.',
    emailRequired: 'Ingresa el correo de tu cuenta.',
    passwordRequired: 'Ingresa tu contraseña.',
    invalidEmail: 'Correo inválido. Verifica la dirección ingresada.',
    passwordMinLength: 'La contraseña debe tener al menos 6 caracteres.',
    register: 'Regístrate',
    registering: 'Creando cuenta...',
    registerUpper: 'REGÍSTRATE',
    orRegisterWith: 'O regístrate con',
    hasAccount: '¿Ya tienes una cuenta?',
    loginHere: 'Inicia sesión aquí',
    fullName: 'Nombre completo',
    cpf: 'CPF',
    phone: 'Teléfono',
    confirmPassword: 'Confirmar contraseña',
    termsPrefix: 'Confirmo que ',
    termsLink: 'tengo más de 18 años',
    privacyLink: 'Política de Privacidad',
    termsSuffix: ' y acepto los Términos y Condiciones.',
    termsRequired: 'Debes aceptar los términos y condiciones para continuar.',
    validEmailRequired: 'Ingresa un correo válido para crear tu cuenta.',
    invalidPhone: 'Teléfono inválido. Usa código de área + número (10 u 11 dígitos).',
    registerFallbackError: 'No fue posible crear tu cuenta. Inténtalo de nuevo.',
    cancelRegistration: '¿Cancelar registro?',
    cancelRegistrationMessage: 'Los datos ingresados se perderán.',
    continueRegistration: 'Continuar registro',
    cancel: 'Cancelar',
    consultingCpf: 'Consultando...',
    cpfInvalid: 'CPF inválido.',
    cpfAlreadyRegistered: 'Este CPF ya está registrado. Inicia sesión o recupera tu cuenta.',
    cpfNotFound: 'CPF no encontrado o inválido.',
    cpfValidationError: 'No fue posible validar el CPF. Inténtalo de nuevo.',
    passwordsMismatch: 'Las contraseñas no coinciden.',
    invalidCredentials: 'Contraseña inválida. Verifica tus datos e inténtalo de nuevo.',
    emailNotConfirmed: 'Confirma tu correo antes de iniciar sesión.',
    userAlreadyExists: 'Este correo ya está registrado. Inicia sesión o usa otro correo.',
    weakPassword: 'Contraseña muy débil. Usa una combinación más segura.',
    weakPasswordMin: (min) => `La contraseña debe tener al menos ${min} caracteres.`,
    validationFailed: 'Correo inválido. Verifica la dirección ingresada.',
    rateLimit: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    signupDisabled: 'Registros temporalmente desactivados. Inténtalo más tarde.',
    userBanned: 'Esta cuenta fue bloqueada. Contacta al soporte.',
    networkError: 'Fallo de conexión. Verifica tu internet e inténtalo de nuevo.',
    cpfDuplicate: 'Este CPF ya está registrado. Inicia sesión o recupera tu cuenta.',
    phoneDuplicate: 'Este teléfono ya está registrado. Usa otro número o inicia sesión.',
  },
};
