import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import StatCard from '../components/ui/StatCard';
import { Crown, Percent, Wallet } from 'lucide-react';

interface VipNivel {
  nivel: number;
  nome: string;
  grupo: string;
  subnivel: number;
  deposito_minimo: number;
  cashback_pct: number;
  bonus_upgrade: number;
  imagem_url: string | null;
  cor: string | null;
}

export default function VipNiveisPage() {
  const { showToast } = useToast();
  const [niveis, setNiveis] = useState<VipNivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<VipNivel>>({});
  const [saving, setSaving] = useState(false);

  const loadNiveis = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('vip_niveis')
        .select('*')
        .order('nivel', { ascending: true });

      if (fetchError) {
        setError('Erro ao carregar níveis VIP.');
        return;
      }
      setNiveis((data as VipNivel[]) || []);
    } catch {
      setError('Erro ao carregar níveis VIP.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNiveis();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const startEdit = (nivel: VipNivel) => {
    setEditing(nivel.nivel);
    setEditForm({
      deposito_minimo: nivel.deposito_minimo,
      cashback_pct: nivel.cashback_pct,
      bonus_upgrade: nivel.bonus_upgrade,
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({});
  };

  const saveEdit = async (nivel: number) => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('vip_niveis')
        .update({
          deposito_minimo: editForm.deposito_minimo,
          cashback_pct: editForm.cashback_pct,
          bonus_upgrade: editForm.bonus_upgrade,
          updated_at: new Date().toISOString(),
        })
        .eq('nivel', nivel);

      if (updateError) {
        showToast('Erro ao salvar nível VIP.', 'error');
        return;
      }

      showToast('Nível VIP atualizado!', 'success');
      cancelEdit();
      await loadNiveis();
    } catch {
      showToast('Erro ao salvar nível VIP.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const maxCashback = niveis.length > 0 ? Math.max(...niveis.map((n) => n.cashback_pct)) : 0;
  const maxDepositoMinimo = niveis.length > 0 ? Math.max(...niveis.map((n) => n.deposito_minimo)) : 0;

  return (
    <div>
      <PageHeader
        icon={Crown}
        title="VIP Níveis"
        description="Configure os valores mínimos de depósito, cashback e bônus de upgrade para cada nível VIP."
      />

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Total de níveis"
            value={String(niveis.length)}
            icon={Crown}
            color="text-admin-accent"
          />
          <StatCard
            title="Cashback máximo"
            value={`${maxCashback}%`}
            icon={Percent}
            color="text-admin-success"
          />
          <StatCard
            title="Depósito mínimo máx."
            value={formatCurrency(maxDepositoMinimo)}
            icon={Wallet}
            color="text-admin-warning"
            small
          />
        </div>
      )}

      {loading ? (
        <LoadingState message="Carregando níveis VIP..." />
      ) : error ? (
        <PagePanel>
          <p className="text-admin-danger">{error}</p>
        </PagePanel>
      ) : niveis.length === 0 ? (
        <PagePanel>
          <EmptyState
            icon={Crown}
            title="Nenhum nível VIP cadastrado"
            description="Execute a migration de níveis VIP no Supabase para popular esta lista."
          />
        </PagePanel>
      ) : (
        <PagePanel padding={false} className="overflow-x-auto">
          <table className="w-full min-w-[700px] admin-table">
            <thead>
              <tr>
                <th>Nível</th>
                <th>Nome</th>
                <th>Depósito mínimo</th>
                <th>Cashback %</th>
                <th>Bônus upgrade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {niveis.map((nivel) => (
                <tr key={nivel.nivel}>
                  <td className="py-3 px-4 text-white font-medium">{nivel.nivel}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {nivel.imagem_url && (
                        <img src={nivel.imagem_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                      )}
                      <span className="text-white">{nivel.nome}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {editing === nivel.nivel ? (
                      <input
                        type="number"
                        value={editForm.deposito_minimo ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, deposito_minimo: Number(e.target.value) })}
                        className="w-28 px-2 py-1 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
                      />
                    ) : (
                      formatCurrency(nivel.deposito_minimo)
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {editing === nivel.nivel ? (
                      <input
                        type="number"
                        step="0.1"
                        value={editForm.cashback_pct ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, cashback_pct: Number(e.target.value) })}
                        className="w-20 px-2 py-1 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
                      />
                    ) : (
                      `${nivel.cashback_pct}%`
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {editing === nivel.nivel ? (
                      <input
                        type="number"
                        value={editForm.bonus_upgrade ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, bonus_upgrade: Number(e.target.value) })}
                        className="w-24 px-2 py-1 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
                      />
                    ) : (
                      formatCurrency(nivel.bonus_upgrade)
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editing === nivel.nivel ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(nivel.nivel)}
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
                      <button
                        onClick={() => startEdit(nivel)}
                        className="px-3 py-1 rounded bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-xs font-medium"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PagePanel>
      )}
    </div>
  );
}
