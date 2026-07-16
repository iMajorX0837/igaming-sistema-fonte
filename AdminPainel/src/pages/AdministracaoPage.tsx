import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Users, UserCog, KeyRound, Clock, Plus, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/ui/StatCard';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PagePanel from '../components/ui/PagePanel';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

interface MembroEquipe {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  ativo: boolean;
  two_factor_enabled: boolean;
  sessoes: number;
  ultimo_acesso: string | null;
  created_at: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'moderador', label: 'Moderador' },
  { value: 'suporte', label: 'Suporte' },
] as const;

const getRoleLabel = (cargo: string) =>
  ROLE_OPTIONS.find((role) => role.value === cargo)?.label ?? cargo;

const formatDateTime = (value: string | null) => {
  if (!value) return 'Nunca';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isWithinLast24h = (value: string | null) => {
  if (!value) return false;
  const date = new Date(value);
  return Date.now() - date.getTime() <= 24 * 60 * 60 * 1000;
};

export default function AdministracaoPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ email: '', nome: '', cargo: 'moderador' });
  const [editForm, setEditForm] = useState({ nome: '', cargo: 'moderador', ativo: true });

  const loadMembros = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc('listar_membros_equipe');

      if (fetchError) {
        console.error(fetchError);
        setError('Erro ao carregar membros da equipe. Execute o script admin_equipe.sql no Supabase.');
        return;
      }

      setMembros((data as MembroEquipe[]) || []);
    } catch {
      setError('Erro ao carregar membros da equipe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembros();
  }, []);

  const stats = useMemo(() => {
    const total = membros.length;
    const ativos = membros.filter((m) => m.ativo).length;
    const administradores = membros.filter((m) => m.cargo === 'admin').length;
    const com2fa = membros.filter((m) => m.two_factor_enabled).length;
    const ultimoAcesso24h = membros.filter((m) => isWithinLast24h(m.ultimo_acesso)).length;
    const pct2fa = total > 0 ? Math.round((com2fa / total) * 100) : 0;

    return { total, ativos, administradores, com2fa, pct2fa, ultimoAcesso24h };
  }, [membros]);

  const cards = [
    {
      title: 'Total de Membros',
      value: stats.total.toString(),
      subtitle: `${stats.ativos} ativos`,
      icon: Users,
      color: 'text-admin-info',
    },
    {
      title: 'Administradores',
      value: stats.administradores.toString(),
      subtitle: 'Acesso completo ao sistema',
      icon: Shield,
      color: 'text-admin-accent',
    },
    {
      title: '2FA Configurado',
      value: stats.com2fa.toString(),
      subtitle: `${stats.pct2fa}% dos membros`,
      icon: KeyRound,
      color: 'text-admin-warning',
    },
    {
      title: 'Último Acesso',
      value: stats.ultimoAcesso24h.toString(),
      subtitle: 'Nas últimas 24h',
      icon: Clock,
      color: 'text-admin-success',
    },
  ];

  const handleAdd = async () => {
    if (!addForm.email.trim()) {
      showToast('Informe o e-mail do membro.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('adicionar_membro_equipe', {
        p_email: addForm.email.trim(),
        p_cargo: addForm.cargo,
        p_nome: addForm.nome.trim() || null,
      });

      if (rpcError) {
        showToast('Erro ao adicionar membro.', 'error');
        return;
      }

      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao adicionar membro.', 'error');
        return;
      }

      showToast('Membro adicionado à equipe!', 'success');
      setShowAddModal(false);
      setAddForm({ email: '', nome: '', cargo: 'moderador' });
      await loadMembros();
    } catch {
      showToast('Erro ao adicionar membro.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (membro: MembroEquipe) => {
    setEditingId(membro.id);
    setEditForm({
      nome: membro.nome || '',
      cargo: membro.cargo,
      ativo: membro.ativo,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('atualizar_membro_equipe', {
        p_usuario_id: id,
        p_cargo: editForm.cargo,
        p_ativo: editForm.ativo,
        p_nome: editForm.nome.trim() || null,
      });

      if (rpcError) {
        showToast('Erro ao salvar membro.', 'error');
        return;
      }

      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao salvar membro.', 'error');
        return;
      }

      showToast('Membro atualizado!', 'success');
      cancelEdit();
      await loadMembros();
    } catch {
      showToast('Erro ao salvar membro.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (membro: MembroEquipe) => {
    if (!window.confirm(`Remover ${membro.nome || membro.email} da equipe administrativa?`)) return;

    setSaving(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('remover_membro_equipe', {
        p_usuario_id: membro.id,
      });

      if (rpcError) {
        showToast('Erro ao remover membro.', 'error');
        return;
      }

      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao remover membro.', 'error');
        return;
      }

      showToast('Membro removido da equipe.', 'success');
      if (editingId === membro.id) cancelEdit();
      await loadMembros();
    } catch {
      showToast('Erro ao remover membro.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        icon={Shield}
        title="Administração"
        description="Gerencie os membros da equipe administrativa com diferentes níveis de acesso."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} loading={loading} />
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-lg font-semibold">Membros da Equipe</h2>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm font-medium disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {loading ? (
        <LoadingState message="Carregando membros..." />
      ) : error ? (
        <PagePanel>
          <p className="text-admin-danger">{error}</p>
        </PagePanel>
      ) : (
        <PagePanel className="overflow-x-auto">
          {membros.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum membro na equipe administrativa." />
          ) : (
          <table className="w-full min-w-[1000px] admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Função</th>
                <th>Status</th>
                <th>2FA</th>
                <th>Sessões</th>
                <th>Último Acesso</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {membros.map((membro) => (
                  <tr key={membro.id}>
                    <td className="py-3 px-4 text-white font-medium">
                      {editingId === membro.id ? (
                        <input
                          type="text"
                          value={editForm.nome}
                          onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                          className="w-full max-w-[180px] px-2 py-1 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
                        />
                      ) : (
                        membro.nome || '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-300">{membro.email}</td>
                    <td className="py-3 px-4">
                      {editingId === membro.id ? (
                        <select
                          value={editForm.cargo}
                          onChange={(e) => setEditForm({ ...editForm, cargo: e.target.value })}
                          className="px-2 py-1 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-admin-accent/12 text-admin-accent">
                          <UserCog className="w-3.5 h-3.5" />
                          {getRoleLabel(membro.cargo)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingId === membro.id ? (
                        <label className="flex items-center gap-2 text-gray-300 text-sm">
                          <input
                            type="checkbox"
                            checked={editForm.ativo}
                            onChange={(e) => setEditForm({ ...editForm, ativo: e.target.checked })}
                          />
                          Ativo
                        </label>
                      ) : (
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${
                            membro.ativo
                              ? 'bg-green-900/40 text-admin-success'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {membro.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                          membro.two_factor_enabled
                            ? 'bg-green-900/40 text-admin-success'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {membro.two_factor_enabled ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{membro.sessoes}</td>
                    <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                      {formatDateTime(membro.ultimo_acesso)}
                    </td>
                    <td className="py-3 px-4">
                      {editingId === membro.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(membro.id)}
                            disabled={saving}
                            className="px-3 py-1 rounded bg-admin-info hover:bg-admin-info/90 text-white text-xs font-medium disabled:opacity-50"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(membro)}
                            disabled={saving}
                            className="p-1.5 rounded bg-admin-accent/12 hover:bg-admin-accent/20 text-admin-accent disabled:opacity-50"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemove(membro)}
                            disabled={saving || membro.id === user?.id}
                            className="p-1.5 rounded bg-red-900/30 hover:bg-red-900/50 text-admin-danger disabled:opacity-50"
                            title={membro.id === user?.id ? 'Você não pode remover a si mesmo' : 'Remover'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          )}
        </PagePanel>
      )}

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Adicionar membro"
        icon={UserCog}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} loading={saving}>
              Adicionar
            </Button>
          </>
        }
      >
        <p className="text-gray-400 text-sm mb-4">
          O usuário precisa já ter uma conta cadastrada no sistema. Informe o e-mail para promovê-lo à equipe.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm mb-1 block">E-mail</label>
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              className="admin-input"
              placeholder="usuario@email.com"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm mb-1 block">Nome (opcional)</label>
            <input
              type="text"
              value={addForm.nome}
              onChange={(e) => setAddForm({ ...addForm, nome: e.target.value })}
              className="admin-input"
              placeholder="Nome de exibição"
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm mb-1 block">Função</label>
            <select
              value={addForm.cargo}
              onChange={(e) => setAddForm({ ...addForm, cargo: e.target.value })}
              className="admin-input"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
