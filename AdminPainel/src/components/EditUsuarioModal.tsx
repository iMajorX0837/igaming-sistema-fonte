import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Pencil } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface Usuario {
  id: string;
  nome: string;
  usuario: string;
  cpf: string;
  email: string;
  telefone: string;
  created_at: string;
  saldo: number;
  cargo?: string;
}

interface EditUsuarioModalProps {
  usuarioId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function EditUsuarioModal({ usuarioId, isOpen, onClose, onUpdate }: EditUsuarioModalProps) {
  const { showToast } = useToast();
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [activeTab, setActiveTab] = useState<'perfil' | 'carteiras' | 'seguranca'>('perfil');
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCPF, setFormCPF] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [valorSaldo, setValorSaldo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carregar dados do usuário quando o modal abrir
  useEffect(() => {
    if (isOpen && usuarioId) {
      loadUsuario();
    } else {
      // Limpar dados quando fechar
      setSelectedUsuario(null);
      setActiveTab('perfil');
      setFormNome('');
      setFormEmail('');
      setFormCPF('');
      setFormTelefone('');
      setFormCargo('');
      setValorSaldo('');
      setNovaSenha('');
      setConfirmarSenha('');
    }
  }, [isOpen, usuarioId]);

  const loadUsuario = async () => {
    if (!usuarioId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, usuario, cpf, email, telefone, created_at, saldo, cargo')
        .eq('id', usuarioId)
        .single();

      if (error) {
        console.error('Erro ao buscar usuário:', error);
        showToast('Erro ao carregar dados do usuário', 'error');
        return;
      }

      if (data) {
        setSelectedUsuario(data);
        setFormNome(data.nome || '');
        setFormEmail(data.email || '');
        setFormCPF(data.cpf || '');
        setFormTelefone(data.telefone || '');
        setFormCargo(data.cargo || 'usuario');
      }
    } catch (err) {
      console.error('Erro ao buscar usuário:', err);
      showToast('Erro ao carregar dados do usuário', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePerfil = async () => {
    if (!selectedUsuario) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: formNome,
          email: formEmail,
          cpf: formCPF,
          telefone: formTelefone,
          cargo: formCargo,
        })
        .eq('id', selectedUsuario.id);

      if (error) {
        showToast(`Erro ao salvar: ${error.message}`, 'error');
        return;
      }

      showToast('Perfil atualizado com sucesso!', 'success');
      if (onUpdate) {
        onUpdate();
      }
      onClose();
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      showToast('Erro ao salvar perfil', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdicionarSaldo = async () => {
    if (!selectedUsuario || !valorSaldo) return;
    
    const valor = parseFloat(valorSaldo);
    if (isNaN(valor) || valor < 0) {
      showToast('Digite um valor válido', 'warning');
      return;
    }

    try {
      setSaving(true);
      
      // Usar função RPC para atualizar saldo (bypassa RLS)
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('atualizar_saldo_usuario', {
          p_usuario_id: selectedUsuario.id,
          p_novo_saldo: valor
        });

      if (rpcError) {
        console.error('Erro ao atualizar saldo via RPC:', rpcError);
        showToast(`Erro ao atualizar saldo: ${rpcError.message}`, 'error');
        return;
      }

      // Verificar se a função RPC retornou sucesso
      if (!rpcResult || !rpcResult.success) {
        console.error('Função RPC não retornou sucesso:', rpcResult);
        showToast(rpcResult?.error || 'Erro ao atualizar saldo', 'error');
        return;
      }

      console.log('Saldo atualizado com sucesso via RPC:', rpcResult);
      showToast('Saldo atualizado com sucesso!', 'success');
      setValorSaldo('');
      
      // Atualizar o saldo local com o valor retornado da função RPC
      const saldoAtualizado = parseFloat(rpcResult.saldo_atual) || valor;
      if (selectedUsuario) {
        setSelectedUsuario({ ...selectedUsuario, saldo: saldoAtualizado });
      }
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Erro ao atualizar saldo:', err);
      showToast('Erro ao atualizar saldo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoverSaldo = async () => {
    if (!selectedUsuario || !valorSaldo) return;
    
    const valor = parseFloat(valorSaldo);
    if (isNaN(valor) || valor <= 0) {
      showToast('Digite um valor válido', 'warning');
      return;
    }

    const novoSaldo = Math.max(0, (selectedUsuario.saldo || 0) - valor);

    try {
      setSaving(true);
      
      // Usar função RPC para atualizar saldo (bypassa RLS)
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('atualizar_saldo_usuario', {
          p_usuario_id: selectedUsuario.id,
          p_novo_saldo: novoSaldo
        });

      if (rpcError) {
        console.error('Erro ao remover saldo via RPC:', rpcError);
        showToast(`Erro ao remover saldo: ${rpcError.message}`, 'error');
        return;
      }

      // Verificar se a função RPC retornou sucesso
      if (!rpcResult || !rpcResult.success) {
        console.error('Função RPC não retornou sucesso:', rpcResult);
        showToast(rpcResult?.error || 'Erro ao remover saldo', 'error');
        return;
      }

      console.log('Saldo removido com sucesso via RPC:', rpcResult);
      showToast('Saldo removido com sucesso!', 'success');
      setValorSaldo('');
      
      // Atualizar o saldo local com o valor retornado da função RPC
      const saldoAtualizado = parseFloat(rpcResult.saldo_atual) || novoSaldo;
      if (selectedUsuario) {
        setSelectedUsuario({ ...selectedUsuario, saldo: saldoAtualizado });
      }
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Erro ao remover saldo:', err);
      showToast('Erro ao remover saldo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAlterarSenha = async () => {
    if (!selectedUsuario) return;
    
    if (!novaSenha || !confirmarSenha) {
      showToast('Preencha todos os campos', 'warning');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      showToast('As senhas não coincidem', 'warning');
      return;
    }

    if (novaSenha.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres', 'warning');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.admin.updateUserById(selectedUsuario.id, {
        password: novaSenha
      });

      if (error) {
        showToast(`Erro ao alterar senha: ${error.message}`, 'error');
        return;
      }

      showToast('Senha alterada com sucesso!', 'success');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      showToast('Erro ao alterar senha. Verifique as permissões de admin.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !usuarioId) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto bg-admin-panel border border-admin-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-admin-border-strong">
          <div className="flex items-center gap-3">
            <Pencil className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Editar usuário</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-6">
            <p className="text-gray-300 text-center">Carregando dados do usuário...</p>
          </div>
        ) : selectedUsuario ? (
          <>
            {/* Tabs */}
            <div className="flex justify-center border-b border-admin-border-strong">
              <button
                onClick={() => setActiveTab('perfil')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'perfil'
                    ? 'text-white border-b-2 border-admin-accent'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Perfil
              </button>
              <button
                onClick={() => setActiveTab('carteiras')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'carteiras'
                    ? 'text-white border-b-2 border-admin-accent'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Carteiras
              </button>
              <button
                onClick={() => setActiveTab('seguranca')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'seguranca'
                    ? 'text-white border-b-2 border-admin-accent'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Segurança
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Aba Perfil */}
              {activeTab === 'perfil' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                      
                      className="w-full px-4 py-2 text-white rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      
                      className="w-full px-4 py-2 text-white rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      CPF
                    </label>
                    <input
                      type="text"
                      value={formCPF}
                      onChange={(e) => setFormCPF(e.target.value)}
                      
                      className="w-full px-4 py-2 text-white rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={formTelefone}
                      onChange={(e) => setFormTelefone(e.target.value)}
                      
                      className="w-full px-4 py-2 text-white rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Tipo de acesso
                    </label>
                    <select
                      value={formCargo}
                      onChange={(e) => setFormCargo(e.target.value)}
                      
                      className="w-full px-4 py-2 text-white rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
                    >
                      <option value="usuario">Usuário</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSavePerfil}
                    disabled={saving}
                    className="w-full px-4 py-2 bg-admin-info hover:bg-admin-info/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}

              {/* Aba Carteiras */}
              {activeTab === 'carteiras' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Saldo Atual
                    </label>
                    <p className="text-white text-2xl font-bold">
                      {formatCurrency(selectedUsuario.saldo || 0)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Novo Saldo
                    </label>
                    <input
                      type="number"
                      value={valorSaldo}
                      onChange={(e) => setValorSaldo(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      
                      className="w-full px-4 py-2 text-white rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      O valor inserido substituirá o saldo atual
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleAdicionarSaldo}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] disabled:opacity-50 rounded-lg transition-colors font-semibold"
                    >
                      {saving ? 'Processando...' : 'Atualizar Saldo'}
                    </button>
                    <button
                      onClick={handleRemoverSaldo}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-admin-danger/15 hover:bg-admin-danger/25 text-admin-danger border border-admin-danger/30 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      {saving ? 'Processando...' : 'Remover'}
                    </button>
                  </div>
                </div>
              )}

              {/* Aba Segurança */}
              {activeTab === 'seguranca' && (
                <div className="space-y-4">
                  <h3 className="text-white text-lg font-medium mb-4">Alterar Senha</h3>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      
                      className="w-full px-4 py-2 text-white rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Confirmar Senha
                    </label>
                    <input
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      
                      className="w-full px-4 py-2 text-white rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
                    />
                  </div>

                  <button
                    onClick={handleAlterarSenha}
                    disabled={saving}
                    className="w-full px-4 py-2 bg-admin-info hover:bg-admin-info/90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {saving ? 'Alterando...' : 'Alterar Senha'}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

