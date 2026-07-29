import { useState, useEffect, useMemo } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import LoginRequiredPanel from './LoginRequiredPanel';
import { useAuth } from '../contexts/AuthContext';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { useUserProfileData } from '../hooks/useUserProfileData';
import { useBetHistory } from '../hooks/useBetHistory';
import { MODAL_ANIM_MS } from '../hooks/useModalAnimation';
import type { BetHistoryItem, UserProfileData } from '../lib/userProfileCache';
import LoadingScreen from './LoadingScreen';
import { useTranslation } from '../hooks/useTranslation';
import { appPageContainerClass } from '../constants/homeLayout';

interface ProfilePageProps {
  onBack: () => void;
}

function ProfileLoginRequired({ onLogin }: { onLogin: () => void }) {
  const { t } = useTranslation();
  return (
    <LoginRequiredPanel message={t.profile.loginRequired} onLogin={onLogin} />
  );
}

const PROFILE_TAB_IDS = [
  { id: 'minha-conta', tabKey: 'account' as const, icon: 'solar:user-bold-duotone' },
  { id: 'seguranca', tabKey: 'security' as const, icon: 'material-symbols:security' },
  { id: 'historico', tabKey: 'history' as const, icon: 'iconamoon:history-duotone' },
  { id: 'verificacao', tabKey: 'kyc' as const, icon: 'hugeicons:face-id' },
  { id: 'recesso', tabKey: 'recess' as const, icon: 'material-symbols:autopause' },
  { id: 'auto-exclusao', tabKey: 'selfExclusion' as const, icon: 'solar:user-block-rounded-bold-duotone' },
] as const;

function BetHistoryMobileCard({
  item,
  backgroundColor,
  labels,
}: {
  item: BetHistoryItem;
  backgroundColor: string;
  labels: {
    value: string;
    return: string;
    status: string;
    withBonus: string;
  };
}) {
  return (
    <div
      className="rounded-xl border border-white/10 p-3 space-y-2.5"
      style={{ backgroundColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
              item.tipo === 'win' ? 'bg-brand' : 'bg-red-500'
            }`}
          >
            {item.tipo === 'win' ? (
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="12 5 12 19" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="12 5 12 19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            )}
          </div>
          <p className="text-sm font-semibold text-white truncate" title={item.jogo}>
            {item.jogo}
          </p>
        </div>
        <span className="text-[11px] text-slate-400 shrink-0">{item.data}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <p className="text-slate-500 mb-0.5">{labels.value}</p>
          <p style={{ color: '#DCDDDE' }}>R$ {item.valor.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-500 mb-0.5">{labels.return}</p>
          <p style={{ color: '#DCDDDE' }}>{item.retorno > 0 ? `R$ ${item.retorno.toFixed(2)}` : 'R$ 0,00'}</p>
        </div>
        <div>
          <p className="text-slate-500 mb-0.5">{labels.status}</p>
          <p style={{ color: '#DCDDDE' }}>{item.status}</p>
        </div>
        <div>
          <p className="text-slate-500 mb-0.5">{labels.withBonus}</p>
          <p style={{ color: '#DCDDDE' }}>{item.bonus}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const profileTabs = useMemo(
    () =>
      PROFILE_TAB_IDS.map((tab) => ({
        ...tab,
        label: t.profile.tabs[tab.tabKey],
      })),
    [t.profile.tabs],
  );
  const { config: homeConfig } = useHomeConfig();
  const profileInputBg = `color-mix(in srgb, ${homeConfig.fundo} 90%, white)`;
  const profileRowAltBg = `color-mix(in srgb, ${homeConfig.fundo} 88%, black)`;
  const profileSectionClass =
    'p-3 md:p-4 max-md:rounded-xl max-md:border max-md:border-white/10 max-md:mb-3 md:border-b';
  const [activeTab, setActiveTab] = useState('minha-conta');
  const [selectedPeriod, setSelectedPeriod] = useState('hoje');
  const [currentPage, setCurrentPage] = useState(1);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const { userData, isLoading: isLoadingUserData } = useUserProfileData(
    isAuthenticated && activeTab === 'minha-conta'
  );
  const { betHistory, isLoading: isLoadingHistory } = useBetHistory(
    selectedPeriod,
    isAuthenticated && activeTab === 'historico'
  );
  const itemsPerPage = 10;

  // Garante que o Iconify escaneia os ícones após renderizar
  useEffect(() => {
    const timer = window.setTimeout(() => {
      (window as Window & { Iconify?: { scan: () => void } }).Iconify?.scan();
    }, 100);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, activeTab]);

  // Função para formatar CPF (XXX.XXX.XXX-XX)
  const formatCPF = (cpf: string | null): string => {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Função para formatar telefone ((XX) XXXXX-XXXX ou (XX) X XXXX-XXXX)
  const formatPhone = (phone: string | null): string => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      // Telefone fixo: (XX) XXXX-XXXX
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 11) {
      // Celular: (XX) XXXXX-XXXX
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  // Função para formatar nome (capitalizar primeira letra de cada palavra)
  const formatName = (name: string | null): string => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const fullNameFromRow = (u: UserProfileData) =>
    (u.usuario_nome && u.usuario_nome.trim()) || (u.nome && u.nome.trim()) || '';

  const totalPages = Math.ceil(betHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBets = betHistory.slice(startIndex, endIndex);

  return (
    <AppPageScaffold>
      <div className={`flex flex-col min-h-full ${appPageContainerClass}`}>
        <div className="flex-1 py-4 sm:py-6 max-md:pb-2">
            <div className="flex items-center gap-2 mb-3 md:hidden">
              <span
                className="iconify i-solar:user-bold-duotone shrink-0"
                aria-hidden="true"
                style={{ fontSize: '28px' }}
              />
              <h1 className="text-white text-xl font-bold">{t.profile.title}</h1>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:gap-6">
              <div className="w-full md:w-48 flex-shrink-0 max-md:mb-1">
                <div className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide -mx-0.5 px-0.5 md:mx-0 md:px-0 md:space-y-1.5 md:overflow-visible max-md:flex-nowrap max-md:snap-x max-md:snap-mandatory max-md:rounded-xl max-md:border max-md:border-white/10 max-md:p-1 max-md:bg-black/15">
                  {profileTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-shrink-0 md:w-full flex items-center gap-1.5 px-2.5 py-2 md:px-3 md:py-2 text-xs font-medium transition-all rounded-lg whitespace-nowrap max-md:snap-start max-md:min-h-[44px] max-md:px-3 ${
                        activeTab === tab.id
                          ? 'bg-brand text-white border-2 border-brand'
                          : 'text-slate-400 border-2 border-transparent'
                      }`}
                      style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 'bold' }}
                    >
                      <span className="iconify shrink-0" data-icon={tab.icon} aria-hidden="true" style={{ fontSize: '18px' }} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-w-0 max-md:pt-1">
                {!isAuthenticated && (
                  <ProfileLoginRequired onLogin={() => setIsLoginOpen(true)} />
                )}

                {isAuthenticated && activeTab === 'minha-conta' && (
                  <div className="space-y-3">
                    <div>
                      <h1 className="text-white text-xl md:text-2xl font-bold mb-1">{t.profile.accountData}</h1>
                    </div>

                    <div className={profileSectionClass} style={{ borderColor: 'var(--brand-primary)' }}>
                      <h2 className="text-white text-base md:text-lg font-semibold mb-2">{t.profile.personalData}</h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>{t.profile.fullName}</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <input
                              type="text"
                              value={isLoadingUserData ? t.common.loading : formatName(fullNameFromRow(userData) || null)}
                              readOnly
                              className="w-full h-11 pl-10 pr-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand"
                              style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>{t.profile.cpf}</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              value={isLoadingUserData ? t.common.loading : formatCPF(userData.cpf)}
                              readOnly
                              className="w-full h-11 pl-10 pr-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand"
                              style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={profileSectionClass} style={{ borderColor: 'var(--brand-primary)' }}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                        <h2 className="text-white text-base md:text-lg font-semibold">{t.profile.contact}</h2>
                        <button type="button" className="text-brand-light text-sm font-semibold hover:text-brand-light transition-colors self-start sm:self-auto">
                          {t.profile.editContact}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>{t.profile.phone}</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                <line x1="12" y1="18" x2="12.01" y2="18" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              value={isLoadingUserData ? t.common.loading : formatPhone(userData.telefone)}
                              readOnly
                              className="w-full h-11 pl-10 pr-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand"
                              style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>{t.profile.email}</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              value={isLoadingUserData ? t.common.loading : (userData.email || '')}
                              readOnly
                              className="w-full h-11 pl-10 pr-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand"
                              style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`${profileSectionClass} max-md:mb-0 pt-2 md:pt-2`} style={{ borderColor: 'var(--brand-primary)' }}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                        <h2 className="text-white text-base md:text-lg font-semibold">{t.profile.address}</h2>
                        <button type="button" className="text-brand-light text-sm font-semibold hover:text-brand-light transition-colors self-start sm:self-auto">
                          {t.profile.editContact}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>{t.profile.zip}</label>
                          <input
                            type="text"
                            placeholder={t.profile.zip}
                            className="w-full h-11 px-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand placeholder-slate-600"
                            style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                          />
                        </div>

                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>{t.profile.city}</label>
                          <input
                            type="text"
                            placeholder={t.profile.city}
                            className="w-full h-11 px-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand placeholder-slate-600"
                            style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                          />
                        </div>

                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>{t.profile.state}</label>
                          <input
                            type="text"
                            placeholder={t.profile.state}
                            className="w-full h-11 px-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand placeholder-slate-600"
                            style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>{t.profile.street}</label>
                          <input
                            type="text"
                            placeholder={t.profile.street}
                            className="w-full h-11 px-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand placeholder-slate-600"
                            style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                          />
                        </div>

                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>{t.profile.number}</label>
                          <input
                            type="text"
                            placeholder={t.profile.number}
                            className="w-full h-11 px-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand placeholder-slate-600"
                            style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                          />
                        </div>

                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>{t.profile.neighborhood}</label>
                          <input
                            type="text"
                            placeholder={t.profile.neighborhood}
                            className="w-full h-11 px-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand placeholder-slate-600"
                            style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isAuthenticated && activeTab === 'seguranca' && (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <h1 className="text-white text-xl md:text-2xl font-bold mb-1">{t.profile.security}</h1>
                      {showPasswordChange && (
                        <button
                          onClick={() => {
                            setShowPasswordChange(false);
                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            setShowCurrentPassword(false);
                            setShowNewPassword(false);
                            setShowConfirmPassword(false);
                          }}
                          className="text-brand-light text-sm font-semibold hover:text-brand-light transition-colors self-start sm:self-auto"
                        >
                          {t.profile.cancel}
                        </button>
                      )}
                    </div>

                    {!showPasswordChange ? (
                      <div className={`${profileSectionClass} max-md:mb-0`} style={{ borderColor: 'var(--brand-primary)' }}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="text-white font-semibold mb-0.5">{t.profile.changePassword}</h3>
                            <p className="text-slate-500 text-sm">••••••••••••</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPasswordChange(true)}
                            className="text-sm font-semibold hover:opacity-80 transition-colors self-start sm:self-auto flex-shrink-0"
                            style={{ color: 'var(--brand-primary)' }}
                          >
                            {t.profile.editContact}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`${profileSectionClass} max-md:mb-0`} style={{ borderColor: 'var(--brand-primary)' }}>
                        <h3 className="text-white font-semibold mb-1">{t.profile.changePassword}</h3>
                        <p className="text-slate-400 text-sm mb-4">
                          {t.profile.passwordHint}
                        </p>

                        <div className="space-y-3">
                          <div>
                            <label className="text-white text-sm mb-1 block">{t.profile.currentPassword}</label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white">
                                <Lock className="w-4 h-4" />
                              </div>
                              <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                placeholder={t.profile.currentPasswordPlaceholder}
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                className="w-full h-11 pl-10 pr-10 border border-brand/40 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                                style={{ backgroundColor: profileInputBg }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-white text-sm mb-1 block">{t.profile.newPassword}</label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white">
                                <Lock className="w-4 h-4" />
                              </div>
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder={t.profile.newPasswordPlaceholder}
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="w-full h-11 pl-10 pr-10 border border-brand/40 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                                style={{ backgroundColor: profileInputBg }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                {showNewPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-white text-sm mb-1 block">{t.profile.confirmPassword}</label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white">
                                <Lock className="w-4 h-4" />
                              </div>
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder={t.profile.confirmPasswordPlaceholder}
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="w-full h-11 pl-10 pr-10 border border-brand/40 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                                style={{ backgroundColor: profileInputBg }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <button
                            disabled={
                              !passwordData.currentPassword ||
                              !passwordData.newPassword ||
                              !passwordData.confirmPassword
                            }
                            className={`w-full h-11 px-4 rounded-lg text-sm font-semibold transition-all border border-brand/40 ${
                              !passwordData.currentPassword ||
                              !passwordData.newPassword ||
                              !passwordData.confirmPassword
                                ? 'text-slate-500 cursor-not-allowed opacity-60'
                                : 'text-white hover:opacity-80 cursor-pointer'
                            }`}
                            style={{ backgroundColor: homeConfig.fundo }}
                          >
                            {t.profile.editContact}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={profileSectionClass} style={{ borderColor: 'var(--brand-primary)' }}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-white font-semibold mb-0.5 text-sm md:text-base">{t.profile.twoFactorAuth}</h3>
                          <p className="text-slate-500 text-sm">{t.profile.disabled}</p>
                        </div>
                        <span className="text-sm flex-shrink-0" style={{ color: 'var(--brand-primary)' }}>{t.profile.comingSoon}</span>
                      </div>
                    </div>

                    <div className={`${profileSectionClass} max-md:mb-0`} style={{ borderColor: 'var(--brand-primary)' }}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-white font-semibold mb-0.5">{t.profile.socialAccounts}</h3>
                          <p className="text-slate-500 text-sm">{t.profile.disabled}</p>
                        </div>
                        <span className="text-sm flex-shrink-0" style={{ color: 'var(--brand-primary)' }}>{t.profile.comingSoon}</span>
                      </div>
                    </div>
                  </div>
                )}

                {isAuthenticated && activeTab === 'historico' && (
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <h1 className="text-white text-xl md:text-2xl font-bold mb-2">{t.profile.betHistory}</h1>
                    </div>

                    <div className="flex gap-2 mb-4 md:mb-6 max-md:flex-nowrap max-md:overflow-x-auto max-md:scrollbar-hide max-md:-mx-1 max-md:px-1 max-md:pb-1">
                      <button
                        onClick={() => { setSelectedPeriod('hoje'); setCurrentPage(1); }}
                        className="shrink-0 whitespace-nowrap px-4 h-8 rounded-lg text-xs font-bold transition-all"
                        style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: selectedPeriod === 'hoje' ? 1 : 0.5 }}
                      >
                        {t.profile.history.today}
                      </button>
                      <button
                        onClick={() => { setSelectedPeriod('ontem'); setCurrentPage(1); }}
                        className="shrink-0 whitespace-nowrap px-4 h-8 rounded-lg text-xs font-bold transition-all"
                        style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: selectedPeriod === 'ontem' ? 1 : 0.5 }}
                      >
                        {t.profile.history.yesterday}
                      </button>
                      <button
                        onClick={() => { setSelectedPeriod('7dias'); setCurrentPage(1); }}
                        className="shrink-0 whitespace-nowrap px-4 h-8 rounded-lg text-xs font-bold transition-all"
                        style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: selectedPeriod === '7dias' ? 1 : 0.5 }}
                      >
                        {t.profile.history.last7Days}
                      </button>
                      <button
                        onClick={() => { setSelectedPeriod('30dias'); setCurrentPage(1); }}
                        className="shrink-0 whitespace-nowrap px-4 h-8 rounded-lg text-xs font-bold transition-all"
                        style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: selectedPeriod === '30dias' ? 1 : 0.5 }}
                      >
                        {t.profile.history.last30Days}
                      </button>
                      <button
                        onClick={() => { setSelectedPeriod('total'); setCurrentPage(1); }}
                        className="shrink-0 whitespace-nowrap px-4 h-8 rounded-lg text-xs font-bold transition-all"
                        style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: selectedPeriod === 'total' ? 1 : 0.5 }}
                      >
                        {t.profile.history.total}
                      </button>
                    </div>

                    {isLoadingHistory && betHistory.length === 0 && (
                      <LoadingScreen title={t.profile.history.loading} variant="inline" className="py-8" />
                    )}

                    <div className="rounded-xl overflow-hidden max-md:border max-md:border-white/10">
                      {!(isLoadingHistory && betHistory.length === 0) && (
                      <div className="space-y-2 p-1 md:hidden">
                        {betHistory.length === 0 ? (
                          <div className="px-3 py-12 text-center">
                            <p className="text-xs" style={{ color: '#DCDDDE' }}>{t.common.noRecords}</p>
                          </div>
                        ) : (
                          currentBets.map((item, index) => (
                            <BetHistoryMobileCard
                              key={`${item.jogo}-${item.data}-${index}`}
                              item={item}
                              backgroundColor={index % 2 === 0 ? homeConfig.fundo : profileRowAltBg}
                              labels={t.profile.history}
                            />
                          ))
                        )}
                      </div>
                      )}

                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead style={{ backgroundColor: profileInputBg }}>
                            <tr>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>{t.profile.history.type}</th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>{t.profile.history.game}</th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>{t.profile.history.value}</th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>{t.profile.history.return}</th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>{t.profile.history.status}</th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>{t.profile.history.withBonus}</th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>{t.profile.history.date}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {betHistory.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-3 md:px-4 py-12 md:py-20 text-center">
                                  <p className="text-xs md:text-sm" style={{ color: '#DCDDDE' }}>{t.common.noRecords}</p>
                                </td>
                              </tr>
                            ) : (
                              currentBets.map((item, index) => (
                                <tr 
                                  key={index} 
                                  className="transition-colors" 
                                  style={{ backgroundColor: index % 2 === 0 ? homeConfig.fundo : profileRowAltBg }}
                                >
                                  <td className="px-2 py-2 md:px-4 md:py-3 align-middle">
                                    <div className={`w-5 h-5 md:w-6 md:h-6 rounded flex items-center justify-center ${
                                      item.tipo === 'win' ? 'bg-brand' : 'bg-red-500'
                                    }`}>
                                      {item.tipo === 'win' ? (
                                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <polyline points="12 5 12 19" />
                                          <polyline points="5 12 12 5 19 12" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <polyline points="12 5 12 19" />
                                          <polyline points="19 12 12 19 5 12" />
                                        </svg>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm max-w-[140px] md:max-w-none truncate md:whitespace-normal" style={{ color: '#DCDDDE' }} title={item.jogo}>{item.jogo}</td>
                                  <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm whitespace-nowrap" style={{ color: '#DCDDDE' }}>R$ {item.valor.toFixed(2)}</td>
                                  <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm whitespace-nowrap" style={{ color: '#DCDDDE' }}>
                                    {item.retorno > 0 ? `R$ ${item.retorno.toFixed(2)}` : 'R$ 0,00'}
                                  </td>
                                  <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm" style={{ color: '#DCDDDE' }}>{item.status}</td>
                                  <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm" style={{ color: '#DCDDDE' }}>{item.bonus}</td>
                                  <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm whitespace-nowrap" style={{ color: '#DCDDDE' }}>{item.data}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {betHistory.length > 0 && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-3 md:px-4 py-3 md:py-4">
                          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="w-8 h-8 rounded font-semibold text-sm flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: 'rgb(var(--brand-primary-rgb) / 0.2)', color: 'var(--brand-primary)' }}
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6" />
                              </svg>
                            </button>

                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNumber;
                              if (totalPages <= 5) {
                                pageNumber = i + 1;
                              } else if (currentPage <= 3) {
                                pageNumber = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNumber = totalPages - 4 + i;
                              } else {
                                pageNumber = currentPage - 2 + i;
                              }

                              return (
                                <button
                                  key={i}
                                  onClick={() => setCurrentPage(pageNumber)}
                                  className="w-8 h-8 rounded font-semibold text-sm flex items-center justify-center transition-all"
                                  style={{ 
                                    backgroundColor: currentPage === pageNumber 
                                      ? 'rgb(var(--brand-primary-rgb) / 0.4)' 
                                      : 'rgb(var(--brand-primary-rgb) / 0.2)',
                                    color: 'var(--brand-primary)'
                                  }}
                                >
                                  {pageNumber}
                                </button>
                              );
                            })}

                            <button
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              className="w-8 h-8 rounded font-semibold text-sm flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: 'rgb(var(--brand-primary-rgb) / 0.2)', color: 'var(--brand-primary)' }}
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-xs sm:text-sm text-center sm:text-left" style={{ color: '#DCDDDE' }}>
                            {t.common.showingRecords(startIndex + 1, Math.min(endIndex, betHistory.length), betHistory.length)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isAuthenticated &&
                  (activeTab === 'verificacao' || activeTab === 'recesso' || activeTab === 'auto-exclusao') && (
                  <div className="p-6 md:p-8 text-center max-md:rounded-xl max-md:border max-md:border-white/10">
                    <p className="text-slate-400 text-base md:text-lg">{t.common.underConstruction}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="max-md:min-h-[6vh] md:min-h-[20vh]" />
        </div>

        <Footer containerClassName="w-full" />
      </div>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          window.setTimeout(() => setIsRegisterOpen(true), MODAL_ANIM_MS);
        }}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          window.setTimeout(() => setIsLoginOpen(true), MODAL_ANIM_MS);
        }}
      />
    </AppPageScaffold>
  );
}
