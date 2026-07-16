import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { usePlataformaConfig } from '../hooks/usePlataformaConfig';
import SiteLogo from './SiteLogo';
import Notification from './Notification';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const pixOptions = [
  { id: 'email', label: 'Email', icon: 'email' },
  { id: 'cpf', label: 'CPF', icon: 'cpf' },
  { id: 'phone', label: 'Telefone', icon: 'phone' },
  { id: 'random', label: 'Chave Aleatória', icon: 'random' },
];

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const { isAuthenticated, user } = useAuth();
  const { config } = usePlataformaConfig();
  const minWithdraw = config.saque_minimo;
  const maxWithdraw = config.saque_maximo;
  const dailyWithdrawLimit = config.saques_diarios_permitidos;
  const [amount, setAmount] = useState('50');
  const [pixType, setPixType] = useState('Email');
  const [pixKey, setPixKey] = useState('contato.brent@gmail.com');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rolloverPendente, setRolloverPendente] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevIsOpenRef = useRef<boolean>(false);

  // Função para buscar saldo do usuário
  const fetchSaldo = useCallback(async () => {
    if (isAuthenticated && user) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('saldo')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar saldo:', error);
          setAvailableBalance(0);
          return;
        }

        if (data) {
          setAvailableBalance(data.saldo || 0);
        } else {
          setAvailableBalance(0);
        }
      } catch (error) {
        console.error('Erro ao buscar saldo:', error);
        setAvailableBalance(0);
      }
    } else {
      setAvailableBalance(0);
    }
  }, [isAuthenticated, user]);

  const fetchRollover = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setRolloverPendente(0);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('obter_rollover_usuario');
      if (error) {
        console.error('Erro ao buscar rollover:', error);
        setRolloverPendente(0);
        return;
      }

      const result = data as { ok?: boolean; rollover_pendente?: number };
      if (result?.ok) {
        setRolloverPendente(Number(result.rollover_pendente) || 0);
      } else {
        setRolloverPendente(0);
      }
    } catch (error) {
      console.error('Erro ao buscar rollover:', error);
      setRolloverPendente(0);
    }
  }, [isAuthenticated, user]);

  // Buscar saldo quando o modal abrir e o usuário estiver autenticado
  useEffect(() => {
    if (isOpen) {
      fetchSaldo();
      void fetchRollover();
      // Resetar estados apenas quando o modal for aberto após estar fechado
      if (!prevIsOpenRef.current) {
        setError(null);
        setSuccess(false);
        setAmount(String(minWithdraw));
      }
      prevIsOpenRef.current = true;
    } else {
      prevIsOpenRef.current = false;
    }
  }, [isOpen, fetchSaldo, fetchRollover, minWithdraw]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = pixOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'email':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 8l9 6 9-6M3 8v10a2 2 0 002 2h14a2 2 0 002-2V8" />
          </svg>
        );
      case 'cpf':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="9" x2="15" y2="9" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        );
      case 'phone':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
          </svg>
        );
      case 'random':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0119.8-4.3M22 12.5a10 10 0 01-19.8 4.2" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const notify = (message: string) => {
    setNotification(message);
    setError(null);
  };

  const handleIncrement = () => {
    const currentAmount = parseInt(amount, 10) || minWithdraw;
    const cap = Math.min(maxWithdraw, availableBalance || maxWithdraw);
    const next = Math.min(currentAmount + 1, cap);
    setAmount(String(next));
  };

  const handleDecrement = () => {
    const currentAmount = parseInt(amount, 10) || minWithdraw;
    if (currentAmount > minWithdraw) {
      setAmount(String(currentAmount - 1));
    }
  };

  const handleAmountBlur = () => {
    const v = parseFloat(String(amount).replace(',', '.'));
    if (!Number.isFinite(v)) return;
    const cap = Math.min(maxWithdraw, availableBalance || maxWithdraw);
    if (v > cap) {
      setAmount(String(Math.floor(cap)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!isAuthenticated || !user) {
      notify('Você precisa estar autenticado para realizar um saque');
      return;
    }

    if (availableBalance < minWithdraw) {
      notify('Saldo insuficiente para realizar um saque.');
      return;
    }

    const valorSaque = parseFloat(String(amount).trim().replace(',', '.'));

    if (!Number.isFinite(valorSaque) || valorSaque <= 0) {
      notify('Por favor, insira um valor válido');
      return;
    }

    if (valorSaque < minWithdraw) {
      notify(`O valor mínimo para saque é R$ ${minWithdraw},00.`);
      return;
    }

    if (valorSaque > maxWithdraw) {
      notify(`O valor máximo para saque é R$ ${maxWithdraw.toLocaleString('pt-BR')},00.`);
      return;
    }

    if (valorSaque > availableBalance) {
      notify('Saldo insuficiente para realizar este saque');
      return;
    }

    if (rolloverPendente > 0) {
      notify(
        `Rollover pendente: aposte mais R$ ${rolloverPendente.toFixed(2).replace('.', ',')} antes de sacar.`
      );
      return;
    }

    if (!pixKey || pixKey.trim() === '') {
      notify('Por favor, informe a chave PIX');
      return;
    }

    setIsSubmitting(true);

    try {
      // Buscar saldo atual do banco antes de processar (evita race condition)
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('saldo')
        .eq('id', user.id)
        .maybeSingle();

      if (usuarioError) {
        throw new Error(usuarioError.message || 'Erro ao buscar saldo atual');
      }

      if (!usuarioData) {
        throw new Error('Usuário não encontrado');
      }

      const saldoAtual = parseFloat(usuarioData.saldo) || 0;

      if (valorSaque < minWithdraw) {
        throw new Error(`O valor mínimo para saque é R$ ${minWithdraw},00.`);
      }

      if (valorSaque > maxWithdraw) {
        throw new Error(`O valor máximo para saque é R$ ${maxWithdraw.toLocaleString('pt-BR')},00.`);
      }

      // Validar saldo novamente com o valor atual do banco
      if (valorSaque > saldoAtual) {
        throw new Error('Saldo insuficiente para realizar este saque');
      }

      // Validar limite diário de saques
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count: saquesHoje, error: countError } = await supabase
        .from('saques')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .gte('data_hora', startOfDay.toISOString());

      if (countError) {
        throw new Error(countError.message || 'Erro ao verificar limite diário de saques');
      }

      if ((saquesHoje ?? 0) >= dailyWithdrawLimit) {
        throw new Error(
          `Limite diário de saques atingido. Máximo de ${dailyWithdrawLimit} saque(s) por dia.`
        );
      }

      // Mapear o tipo de chave PIX para o formato do banco
      const mapPixTypeToKey = (type: string): string => {
        const typeMap: { [key: string]: string } = {
          'Email': 'email',
          'CPF': 'cpf',
          'Telefone': 'telefone',
          'Chave Aleatória': 'chave aleatória'
        };
        return typeMap[type] || 'email';
      };

      // Criar registro de saque na tabela saques
      const { data: saqueData, error: saqueError } = await supabase
        .from('saques')
        .insert({
          usuario_id: user.id,
          valor: valorSaque,
          status: 'pendente', // Inicia como pendente, pode ser aprovado depois
          key: mapPixTypeToKey(pixType),
          chave: pixKey.trim(),
        })
        .select()
        .single();

      if (saqueError) {
        const msg = saqueError.message || '';
        if (msg.includes('Limite diário de saques') || msg.includes('Rollover pendente')) {
          throw new Error(msg);
        }
        throw new Error(msg || 'Erro ao criar solicitação de saque');
      }

      // Atualizar saldo do usuário usando função RPC (bypassa RLS)
      const { data: rpcResult, error: saldoError } = await supabase
        .rpc('subtrair_saldo_saque', {
          p_usuario_id: user.id,
          p_valor_saque: valorSaque
        });

      if (saldoError) {
        console.error('Erro ao atualizar saldo via RPC:', saldoError);
        // Se falhar ao atualizar o saldo, tentar deletar o saque criado
        await supabase
          .from('saques')
          .delete()
          .eq('id', saqueData.id);
        
        throw new Error(saldoError.message || 'Erro ao atualizar saldo');
      }

      // Verificar se a função RPC retornou sucesso
      if (!rpcResult || !rpcResult.success) {
        console.error('Função RPC não retornou sucesso:', rpcResult);
        // Se não retornou sucesso, tentar deletar o saque criado
        await supabase
          .from('saques')
          .delete()
          .eq('id', saqueData.id);
        
        throw new Error(rpcResult?.error || 'Erro ao atualizar saldo');
      }

      console.log('Saldo atualizado com sucesso via RPC:', rpcResult);

      setSuccess(true);
      
      // Atualizar o saldo local com o valor retornado da função RPC
      const saldoAtualizado = parseFloat(rpcResult.saldo_atual) || (saldoAtual - valorSaque);
      setAvailableBalance(saldoAtualizado);
      
      // Limpar formulário
      setAmount('100');
      setPixKey('contato.brent@gmail.com');
      
      // Fechar modal após 2 segundos
      setTimeout(() => {
        onClose();
        setSuccess(false);
        fetchSaldo(); // Recarregar saldo
      }, 2000);

    } catch (err: any) {
      console.error('Erro ao processar saque:', err);
      setError(err.message || 'Erro ao processar saque. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Notification
      isOpen={notification !== null}
      onClose={() => setNotification(null)}
      message={notification ?? ''}
    />
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm bg-[#121319] rounded-xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-all duration-200 border border-slate-600 hover:border-slate-500"
        >
          <X className="w-4 h-4 text-slate-300 hover:text-white transition-colors" />
        </button>

        <div className="relative flex w-full justify-center items-center py-6 bg-[#121319] rounded-t-xl">
          <SiteLogo className="h-10 w-auto max-w-[min(100%,200px)] object-contain" />
        </div>

        <div className="px-4 py-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <h2 className="text-white font-bold text-lg mb-0.5">Saques</h2>
              <p className="text-slate-400 text-xs">Escolha o valor que deseja sacar da sua conta</p>
            </div>

            <div>
              <label className="text-white text-xs font-medium mb-1.5 block">Valor a sacar</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-medium">$</span>
                <input
                  type="number"
                  min={minWithdraw}
                  max={maxWithdraw}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={handleAmountBlur}
                  disabled={isSubmitting}
                  className="w-full h-9 pl-7 pr-16 rounded-lg bg-[#181923] border-2 border-violet-600 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-600/50 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={isSubmitting}
                    className="w-6 h-6 rounded bg-violet-600 hover:bg-violet-700 flex items-center justify-center text-white transition-all font-bold text-sm disabled:opacity-50"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={isSubmitting}
                    className="w-6 h-6 rounded bg-violet-600 hover:bg-violet-700 flex items-center justify-center text-white transition-all font-bold text-sm disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <span className="text-slate-300">
                Disponível para saque: <span className="text-white font-bold">R$ {availableBalance.toFixed(2)}</span>
              </span>
            </div>

            {rolloverPendente > 0 ? (
              <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/40">
                <p className="text-amber-300 text-xs font-medium">
                  Rollover pendente: aposte mais{' '}
                  <span className="text-white font-bold">
                    R$ {rolloverPendente.toFixed(2).replace('.', ',')}
                  </span>{' '}
                  em jogos para liberar saques.
                </p>
              </div>
            ) : null}

            {/* Mensagens de erro e sucesso */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50">
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-violet-600/20 border border-violet-600/50">
                <p className="text-violet-400 text-xs font-medium">
                  Saque solicitado com sucesso! O valor será processado em breve.
                </p>
              </div>
            )}

            <div className="border-t border-slate-700/50 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 text-xs mb-1.5 block">Tipo de Chave</label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(!isDropdownOpen);
                        setSearchTerm('');
                      }}
                      disabled={isSubmitting}
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#181923] border-2 border-violet-600 text-white text-xs flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-violet-600/50 transition-all text-left disabled:opacity-50"
                    >
                      <span>{pixType}</span>
                      <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#181923] border-2 border-violet-600 rounded-lg shadow-xl z-[60] overflow-hidden">
                        <div className="p-2 border-b border-slate-700">
                          <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-8 pl-3 pr-3 rounded bg-[#181923] border border-violet-600/30 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-violet-600"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-600 scrollbar-track-slate-800 hover:scrollbar-thumb-violet-400">
                          {filteredOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setPixType(option.label);
                                setIsDropdownOpen(false);
                                setSearchTerm('');
                              }}
                              className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-violet-600/10 text-white text-xs transition-colors"
                            >
                              <div className="text-violet-400">
                                {getIcon(option.icon)}
                              </div>
                              <span>{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-xs mb-1.5 block">Chave PIX</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#181923] border-2 border-violet-600 text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-600/50 transition-all disabled:opacity-50"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-yellow-400 text-[10px] leading-tight">
              O PIX cadastrado deve ser próprio (CPF). Não serão pagos prêmios em PIX de outras titularidades.
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-lg bg-[#7B3FF2] hover:bg-[#6528D7] disabled:bg-[#7B3FF2] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-all duration-200 active:scale-[0.98]"
              style={{
                boxShadow: '0px 4px 18.4px 0px rgba(23, 103, 238, 0.45), 0px 0px 10px 0px rgba(0, 69, 209, 0.40), 0px 1px 0px 0px rgba(255, 255, 255, 0.20) inset, 0px -3px 0px 0px rgba(0, 0, 0, 0.15) inset, 0px 0px 12px 0px #0035A1 inset'
              }}
            >
              {isSubmitting ? 'Processando...' : 'Sacar'}
            </button>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
