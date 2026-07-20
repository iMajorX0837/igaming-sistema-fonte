import { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { useUserProfileData } from '../hooks/useUserProfileData';
import { useBetHistory } from '../hooks/useBetHistory';
import type { BetHistoryItem, UserProfileData } from '../lib/userProfileCache';
import LoadingScreen from './LoadingScreen';
import { appPageContainerClass } from '../constants/homeLayout';

interface ProfilePageProps {
  onBack: () => void;
}

const PROFILE_TABS = [
  { id: 'minha-conta', label: 'Minha conta', icon: 'solar:user-bold-duotone' },
  { id: 'seguranca', label: 'Segurança e login', icon: 'material-symbols:security' },
  { id: 'historico', label: 'Histórico de jogo', icon: 'iconamoon:history-duotone' },
  { id: 'verificacao', label: 'Verificação KYC', icon: 'hugeicons:face-id' },
  { id: 'recesso', label: 'Recesso / Pausa', icon: 'material-symbols:autopause' },
  { id: 'auto-exclusao', label: 'Auto-exclusão', icon: 'solar:user-block-rounded-bold-duotone' },
] as const;

function BetHistoryMobileCard({
  item,
  backgroundColor,
}: {
  item: BetHistoryItem;
  backgroundColor: string;
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
          <p className="text-slate-500 mb-0.5">Valor</p>
          <p style={{ color: '#DCDDDE' }}>R$ {item.valor.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-500 mb-0.5">Retorno</p>
          <p style={{ color: '#DCDDDE' }}>{item.retorno > 0 ? `R$ ${item.retorno.toFixed(2)}` : 'R$ 0,00'}</p>
        </div>
        <div>
          <p className="text-slate-500 mb-0.5">Status</p>
          <p style={{ color: '#DCDDDE' }}>{item.status}</p>
        </div>
        <div>
          <p className="text-slate-500 mb-0.5">c/ bônus</p>
          <p style={{ color: '#DCDDDE' }}>{item.bonus}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { isAuthenticated, user } = useAuth();
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
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const { userData, isLoading: isLoadingUserData, updateUserData } = useUserProfileData(
    activeTab === 'minha-conta'
  );
  const { betHistory, isLoading: isLoadingHistory } = useBetHistory(
    selectedPeriod,
    activeTab === 'historico'
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const itemsPerPage = 10;

  // Garante que o Iconify escaneia os ícones após renderizar
  useEffect(() => {
    if ((window as any).Iconify) {
      (window as any).Iconify.scan();
    }
  });

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

  // Função para iniciar edição do nome
  const handleStartEditName = () => {
    setEditedName(fullNameFromRow(userData));
    setIsEditingName(true);
  };

  // Função para cancelar edição do nome
  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  // Função para salvar o nome
  const handleSaveName = async () => {
    if (!isAuthenticated || !user) return;

    setIsSavingName(true);
    try {
      const trimmed = editedName.trim() || null;
      const { error } = await supabase
        .from('usuarios')
        .update({ usuario_nome: trimmed, nome: trimmed })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao salvar nome:', error);
        alert('Erro ao salvar nome. Tente novamente.');
        return;
      }

      updateUserData({ usuario_nome: trimmed, nome: trimmed });
      setIsEditingName(false);
    } catch (error) {
      console.error('Erro ao salvar nome:', error);
      alert('Erro ao salvar nome. Tente novamente.');
    } finally {
      setIsSavingName(false);
    }
  };

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
              <h1 className="text-white text-xl font-bold">Perfil</h1>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:gap-6">
              <div className="w-full md:w-48 flex-shrink-0 max-md:mb-1">
                <div className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide -mx-0.5 px-0.5 md:mx-0 md:px-0 md:space-y-1.5 md:overflow-visible max-md:flex-nowrap max-md:snap-x max-md:snap-mandatory max-md:rounded-xl max-md:border max-md:border-white/10 max-md:p-1 max-md:bg-black/15">
                  {PROFILE_TABS.map((tab) => (
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
                {activeTab === 'minha-conta' && (
                  <div className="space-y-3">
                    <div>
                      <h1 className="text-white text-xl md:text-2xl font-bold mb-1">Dados da conta</h1>
                    </div>

                    <div className={profileSectionClass} style={{ borderColor: 'var(--brand-primary)' }}>
                      <h2 className="text-white text-base md:text-lg font-semibold mb-2">Dados pessoais</h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>Nome completo</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            {isEditingName ? (
                              <>
                                <input
                                  type="text"
                                  value={editedName}
                                  onChange={(e) => setEditedName(e.target.value)}
                                  className="w-full h-11 pl-10 pr-24 border border-brand rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                                  style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                                  autoFocus
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                  <button
                                    onClick={handleSaveName}
                                    disabled={isSavingName}
                                    className="p-1.5 rounded hover:bg-brand/20 transition-colors disabled:opacity-50"
                                    title="Salvar"
                                  >
                                    <span className="iconify" data-icon="mdi:check" aria-hidden="true" style={{ fontSize: '18px', color: 'var(--brand-primary)' }}></span>
                                  </button>
                                  <button
                                    onClick={handleCancelEditName}
                                    disabled={isSavingName}
                                    className="p-1.5 rounded hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                    title="Cancelar"
                                  >
                                    <span className="iconify" data-icon="mdi:close" aria-hidden="true" style={{ fontSize: '18px', color: '#ef4444' }}></span>
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <input
                                  type="text"
                                  value={isLoadingUserData ? 'Carregando...' : formatName(fullNameFromRow(userData) || null)}
                                  readOnly
                                  className="w-full h-11 pl-10 pr-10 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand"
                                  style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                                />
                                <button
                                  onClick={handleStartEditName}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-brand/20 transition-colors"
                                  title="Editar nome"
                                >
                                  <span className="iconify" data-icon="mdi:pencil" aria-hidden="true" style={{ fontSize: '16px', color: 'var(--brand-primary)' }}></span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>CPF</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              value={isLoadingUserData ? 'Carregando...' : formatCPF(userData.cpf)}
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
                        <h2 className="text-white text-base md:text-lg font-semibold">Contato</h2>
                        <button type="button" className="text-brand-light text-sm font-semibold hover:text-brand-light transition-colors self-start sm:self-auto">
                          Alterar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>Telefone</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                <line x1="12" y1="18" x2="12.01" y2="18" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              value={isLoadingUserData ? 'Carregando...' : formatPhone(userData.telefone)}
                              readOnly
                              className="w-full h-11 pl-10 pr-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand"
                              style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>E-mail</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              value={isLoadingUserData ? 'Carregando...' : (userData.email || '')}
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
                        <h2 className="text-white text-base md:text-lg font-semibold">Endereço</h2>
                        <button type="button" className="text-brand-light text-sm font-semibold hover:text-brand-light transition-colors self-start sm:self-auto">
                          Alterar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>CEP</label>
                          <input
                            type="text"
                            placeholder="CEP"
                            className="w-full h-11 px-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand placeholder-slate-600"
                            style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                          />
                        </div>

                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>Cidade</label>
                          <input
                            type="text"
                            placeholder="Cidade"
                            className="w-full h-11 px-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand placeholder-slate-600"
                            style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                          />
                        </div>

                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>Estado</label>
                          <input
                            type="text"
                            placeholder="Estado"
                            className="w-full h-11 px-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand placeholder-slate-600"
                            style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>Rua</label>
                          <input
                            type="text"
                            placeholder="Rua"
                            className="w-full h-11 px-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand placeholder-slate-600"
                            style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                          />
                        </div>

                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>Número</label>
                          <input
                            type="text"
                            placeholder="Número"
                            className="w-full h-11 px-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand placeholder-slate-600"
                            style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                          />
                        </div>

                        <div>
                          <label className="text-sm mb-1 block" style={{ color: '#FFFFFF' }}>Bairro</label>
                          <input
                            type="text"
                            placeholder="Bairro"
                            className="w-full h-11 px-4 border border-brand/40 rounded-lg text-sm focus:outline-none focus:border-brand placeholder-slate-600"
                            style={{ backgroundColor: profileInputBg, color: '#FFFFFF' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'seguranca' && (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <h1 className="text-white text-xl md:text-2xl font-bold mb-1">Segurança e login</h1>
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
                          Cancelar
                        </button>
                      )}
                    </div>

                    {!showPasswordChange ? (
                      <div className={`${profileSectionClass} max-md:mb-0`} style={{ borderColor: 'var(--brand-primary)' }}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="text-white font-semibold mb-0.5">Alterar senha de segurança</h3>
                            <p className="text-slate-500 text-sm">••••••••••••</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPasswordChange(true)}
                            className="text-sm font-semibold hover:opacity-80 transition-colors self-start sm:self-auto flex-shrink-0"
                            style={{ color: 'var(--brand-primary)' }}
                          >
                            Alterar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`${profileSectionClass} max-md:mb-0`} style={{ borderColor: 'var(--brand-primary)' }}>
                        <h3 className="text-white font-semibold mb-1">Alterar senha de segurança</h3>
                        <p className="text-slate-400 text-sm mb-4">
                          Aqui você pode atualizar a senha da sua conta. Certifique-se de que a nova senha criada é forte e segura
                        </p>

                        <div className="space-y-3">
                          <div>
                            <label className="text-white text-sm mb-1 block">Senha atual</label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white">
                                <Lock className="w-4 h-4" />
                              </div>
                              <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                placeholder="Informe a senha atual"
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
                            <label className="text-white text-sm mb-1 block">Nova senha</label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white">
                                <Lock className="w-4 h-4" />
                              </div>
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="Informe sua nova senha"
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
                            <label className="text-white text-sm mb-1 block">Confirmar senha</label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white">
                                <Lock className="w-4 h-4" />
                              </div>
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Confirme sua nova senha"
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
                            Alterar
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={`${profileSectionClass} md:border-t`} style={{ borderColor: 'var(--brand-primary)' }}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-white font-semibold mb-0.5 text-sm md:text-base">Autenticação de dois fatores (2FA)</h3>
                          <p className="text-slate-500 text-sm">Desativado</p>
                        </div>
                        <span className="text-sm flex-shrink-0" style={{ color: 'var(--brand-primary)' }}>Em breve</span>
                      </div>
                    </div>

                    <div className={`${profileSectionClass} max-md:mb-0 md:border-t`} style={{ borderColor: 'var(--brand-primary)' }}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-white font-semibold mb-0.5">Contas Redes Sociais</h3>
                          <p className="text-slate-500 text-sm">Desativado</p>
                        </div>
                        <span className="text-sm flex-shrink-0" style={{ color: 'var(--brand-primary)' }}>Em breve</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'historico' && (
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <h1 className="text-white text-xl md:text-2xl font-bold mb-2">Histórico de apostas</h1>
                    </div>

                    <div className="flex gap-2 mb-4 md:mb-6 max-md:flex-nowrap max-md:overflow-x-auto max-md:scrollbar-hide max-md:-mx-1 max-md:px-1 max-md:pb-1">
                      <button
                        onClick={() => { setSelectedPeriod('hoje'); setCurrentPage(1); }}
                        className="shrink-0 whitespace-nowrap px-4 h-8 rounded-lg text-xs font-bold transition-all"
                        style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: selectedPeriod === 'hoje' ? 1 : 0.5 }}
                      >
                        Somente hoje
                      </button>
                      <button
                        onClick={() => { setSelectedPeriod('ontem'); setCurrentPage(1); }}
                        className="shrink-0 whitespace-nowrap px-4 h-8 rounded-lg text-xs font-bold transition-all"
                        style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: selectedPeriod === 'ontem' ? 1 : 0.5 }}
                      >
                        Somente ontem
                      </button>
                      <button
                        onClick={() => { setSelectedPeriod('7dias'); setCurrentPage(1); }}
                        className="shrink-0 whitespace-nowrap px-4 h-8 rounded-lg text-xs font-bold transition-all"
                        style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: selectedPeriod === '7dias' ? 1 : 0.5 }}
                      >
                        Últimos 7 dias
                      </button>
                      <button
                        onClick={() => { setSelectedPeriod('30dias'); setCurrentPage(1); }}
                        className="shrink-0 whitespace-nowrap px-4 h-8 rounded-lg text-xs font-bold transition-all"
                        style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: selectedPeriod === '30dias' ? 1 : 0.5 }}
                      >
                        Últimos 30 dias
                      </button>
                      <button
                        onClick={() => { setSelectedPeriod('total'); setCurrentPage(1); }}
                        className="shrink-0 whitespace-nowrap px-4 h-8 rounded-lg text-xs font-bold transition-all"
                        style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: selectedPeriod === 'total' ? 1 : 0.5 }}
                      >
                        Período total
                      </button>
                    </div>

                    {isLoadingHistory && betHistory.length === 0 && (
                      <LoadingScreen title="Carregando histórico..." variant="inline" className="py-8" />
                    )}

                    <div className="rounded-xl overflow-hidden max-md:border max-md:border-white/10">
                      {!(isLoadingHistory && betHistory.length === 0) && (
                      <div className="space-y-2 p-1 md:hidden">
                        {betHistory.length === 0 ? (
                          <div className="px-3 py-12 text-center">
                            <p className="text-xs" style={{ color: '#DCDDDE' }}>Nenhum registro encontrado</p>
                          </div>
                        ) : (
                          currentBets.map((item, index) => (
                            <BetHistoryMobileCard
                              key={`${item.jogo}-${item.data}-${index}`}
                              item={item}
                              backgroundColor={index % 2 === 0 ? homeConfig.fundo : profileRowAltBg}
                            />
                          ))
                        )}
                      </div>
                      )}

                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead style={{ backgroundColor: profileInputBg }}>
                            <tr>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>Tipo</th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>Jogo</th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>Valor</th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>Retorno</th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>Status</th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>c/ bônus</th>
                              <th className="px-2 py-2 md:px-4 md:py-3 text-left text-xs md:text-sm font-semibold whitespace-nowrap" style={{ color: '#DCDDDE' }}>Data</th>
                            </tr>
                          </thead>
                          <tbody>
                            {betHistory.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-3 md:px-4 py-12 md:py-20 text-center">
                                  <p className="text-xs md:text-sm" style={{ color: '#DCDDDE' }}>Nenhum registro encontrado</p>
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
                            Exibindo {startIndex + 1} a {Math.min(endIndex, betHistory.length)} de {betHistory.length} registros
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(activeTab === 'verificacao' || activeTab === 'recesso' || activeTab === 'auto-exclusao') && (
                  <div className="p-6 md:p-8 text-center max-md:rounded-xl max-md:border max-md:border-white/10">
                    <p className="text-slate-400 text-base md:text-lg">Em construção</p>
                  </div>
                )}
              </div>
            </div>

            <div className="max-md:min-h-[6vh] md:min-h-[20vh]" />
        </div>

        <Footer containerClassName="w-full" />
      </div>
    </AppPageScaffold>
  );
}
