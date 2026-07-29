import type { CopyByLanguage } from './types';

export type ProfileCopy = {
  title: string;
  loginRequired: string;
  loginNow: string;
  accountData: string;
  personalData: string;
  fullName: string;
  cpf: string;
  contact: string;
  editContact: string;
  phone: string;
  email: string;
  address: string;
  addressPlaceholder: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  security: string;
  changePassword: string;
  passwordHint: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  currentPasswordPlaceholder: string;
  newPasswordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  twoFactorAuth: string;
  socialAccounts: string;
  disabled: string;
  cancel: string;
  save: string;
  comingSoon: string;
  betHistory: string;
  kyc: string;
  recess: string;
  selfExclusion: string;
  tabs: {
    account: string;
    security: string;
    history: string;
    kyc: string;
    recess: string;
    selfExclusion: string;
  };
  history: {
    value: string;
    return: string;
    status: string;
    withBonus: string;
    today: string;
    yesterday: string;
    last7Days: string;
    last30Days: string;
    total: string;
    loading: string;
    type: string;
    game: string;
    date: string;
  };
};

export const PROFILE_COPY: CopyByLanguage<ProfileCopy> = {
  pt: {
    title: 'Perfil',
    loginRequired: 'Você precisa estar logado para acessar seu perfil.',
    loginNow: 'Entrar agora',
    accountData: 'Dados da conta',
    personalData: 'Dados pessoais',
    fullName: 'Nome completo',
    cpf: 'CPF',
    contact: 'Contato',
    editContact: 'Editar contato',
    phone: 'Telefone',
    email: 'E-mail',
    address: 'Endereço',
    addressPlaceholder: 'Rua, número, complemento',
    street: 'Rua',
    number: 'Número',
    neighborhood: 'Bairro',
    city: 'Cidade',
    state: 'Estado',
    zip: 'CEP',
    security: 'Segurança e login',
    changePassword: 'Alterar senha de segurança',
    passwordHint:
      'Aqui você pode atualizar a senha da sua conta. Certifique-se de que a nova senha criada é forte e segura',
    currentPassword: 'Senha atual',
    newPassword: 'Nova senha',
    confirmPassword: 'Confirmar senha',
    currentPasswordPlaceholder: 'Informe a senha atual',
    newPasswordPlaceholder: 'Informe sua nova senha',
    confirmPasswordPlaceholder: 'Confirme sua nova senha',
    twoFactorAuth: 'Autenticação de dois fatores (2FA)',
    socialAccounts: 'Contas Redes Sociais',
    disabled: 'Desativado',
    cancel: 'Cancelar',
    save: 'Salvar',
    comingSoon: 'Em breve',
    betHistory: 'Histórico de jogo',
    kyc: 'Verificação KYC',
    recess: 'Recesso / Pausa',
    selfExclusion: 'Auto-exclusão',
    tabs: {
      account: 'Minha conta',
      security: 'Segurança e login',
      history: 'Histórico de jogo',
      kyc: 'Verificação KYC',
      recess: 'Recesso / Pausa',
      selfExclusion: 'Auto-exclusão',
    },
    history: {
      value: 'Valor',
      return: 'Retorno',
      status: 'Status',
      withBonus: 'c/ bônus',
      today: 'Hoje',
      yesterday: 'Ontem',
      last7Days: 'Últimos 7 dias',
      last30Days: 'Últimos 30 dias',
      total: 'Total',
      loading: 'Carregando histórico...',
      type: 'Tipo',
      game: 'Jogo',
      date: 'Data',
    },
  },
  en: {
    title: 'Profile',
    loginRequired: 'You must be signed in to access your profile.',
    loginNow: 'Sign in now',
    accountData: 'Account details',
    personalData: 'Personal information',
    fullName: 'Full name',
    cpf: 'CPF',
    contact: 'Contact',
    editContact: 'Edit contact',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    addressPlaceholder: 'Street, number, complement',
    street: 'Street',
    number: 'Number',
    neighborhood: 'Neighborhood',
    city: 'City',
    state: 'State',
    zip: 'ZIP code',
    security: 'Security & login',
    changePassword: 'Change security password',
    passwordHint:
      'Here you can update your account password. Make sure the new password is strong and secure',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    currentPasswordPlaceholder: 'Enter your current password',
    newPasswordPlaceholder: 'Enter your new password',
    confirmPasswordPlaceholder: 'Confirm your new password',
    twoFactorAuth: 'Two-factor authentication (2FA)',
    socialAccounts: 'Social accounts',
    disabled: 'Disabled',
    cancel: 'Cancel',
    save: 'Save',
    comingSoon: 'Coming soon',
    betHistory: 'Game history',
    kyc: 'KYC verification',
    recess: 'Break / Pause',
    selfExclusion: 'Self-exclusion',
    tabs: {
      account: 'My account',
      security: 'Security & login',
      history: 'Game history',
      kyc: 'KYC verification',
      recess: 'Break / Pause',
      selfExclusion: 'Self-exclusion',
    },
    history: {
      value: 'Amount',
      return: 'Return',
      status: 'Status',
      withBonus: 'w/ bonus',
      today: 'Today',
      yesterday: 'Yesterday',
      last7Days: 'Last 7 days',
      last30Days: 'Last 30 days',
      total: 'Total',
      loading: 'Loading history...',
      type: 'Type',
      game: 'Game',
      date: 'Date',
    },
  },
  es: {
    title: 'Perfil',
    loginRequired: 'Debes iniciar sesión para acceder a tu perfil.',
    loginNow: 'Entrar ahora',
    accountData: 'Datos de la cuenta',
    personalData: 'Datos personales',
    fullName: 'Nombre completo',
    cpf: 'CPF',
    contact: 'Contacto',
    editContact: 'Editar contacto',
    phone: 'Teléfono',
    email: 'Correo electrónico',
    address: 'Dirección',
    addressPlaceholder: 'Calle, número, complemento',
    street: 'Calle',
    number: 'Número',
    neighborhood: 'Barrio',
    city: 'Ciudad',
    state: 'Estado',
    zip: 'Código postal',
    security: 'Seguridad e inicio de sesión',
    changePassword: 'Cambiar contraseña de seguridad',
    passwordHint:
      'Aquí puedes actualizar la contraseña de tu cuenta. Asegúrate de que la nueva contraseña sea fuerte y segura',
    currentPassword: 'Contraseña actual',
    newPassword: 'Nueva contraseña',
    confirmPassword: 'Confirmar contraseña',
    currentPasswordPlaceholder: 'Ingresa la contraseña actual',
    newPasswordPlaceholder: 'Ingresa tu nueva contraseña',
    confirmPasswordPlaceholder: 'Confirma tu nueva contraseña',
    twoFactorAuth: 'Autenticación de dos factores (2FA)',
    socialAccounts: 'Cuentas de redes sociales',
    disabled: 'Desactivado',
    cancel: 'Cancelar',
    save: 'Guardar',
    comingSoon: 'Próximamente',
    betHistory: 'Historial de juego',
    kyc: 'Verificación KYC',
    recess: 'Receso / Pausa',
    selfExclusion: 'Autoexclusión',
    tabs: {
      account: 'Mi cuenta',
      security: 'Seguridad e inicio de sesión',
      history: 'Historial de juego',
      kyc: 'Verificación KYC',
      recess: 'Receso / Pausa',
      selfExclusion: 'Autoexclusión',
    },
    history: {
      value: 'Valor',
      return: 'Retorno',
      status: 'Estado',
      withBonus: 'c/ bono',
      today: 'Hoy',
      yesterday: 'Ayer',
      last7Days: 'Últimos 7 días',
      last30Days: 'Últimos 30 días',
      total: 'Total',
      loading: 'Cargando historial...',
      type: 'Tipo',
      game: 'Juego',
      date: 'Fecha',
    },
  },
};
