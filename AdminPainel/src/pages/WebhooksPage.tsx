import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { generateWebhookSecret, testWebhook } from '../lib/webhooksApi';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { Copy, Send, RefreshCw, CheckCircle2, XCircle, Webhook } from 'lucide-react';

const WEBHOOK_EVENTS = [
  { value: 'user.register', label: 'Registro de usuário (user.register)' },
  { value: 'deposit.created', label: 'Depósito criado (deposit.created)' },
  { value: 'deposit.paid', label: 'Depósito concluído (deposit.paid)' },
  { value: 'withdraw.approved', label: 'Saque aprovado (withdraw.approved)' },
] as const;

interface WebhookRow {
  id: string;
  nome: string;
  url: string;
  evento: string;
  secret_key: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface DeliveryRow {
  id: string;
  webhook_id: string;
  evento: string;
  status: string;
  http_status: number | null;
  tentativas: number;
  erro: string | null;
  created_at: string;
  delivered_at: string | null;
}

const emptyForm = {
  nome: '',
  url: '',
  evento: 'user.register',
  secret_key: generateWebhookSecret(),
  ativo: true,
};

function eventLabel(value: string) {
  return WEBHOOK_EVENTS.find((e) => e.value === value)?.label ?? value;
}

export default function WebhooksPage() {
  const { showToast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [logsWebhookId, setLogsWebhookId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        showToast('Erro ao carregar webhooks. Execute webhooks.sql no Supabase.', 'error');
        return;
      }

      setWebhooks((data as WebhookRow[]) ?? []);
    } catch {
      showToast('Erro ao carregar webhooks.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadDeliveries = useCallback(
    async (webhookId: string) => {
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('id, webhook_id, evento, status, http_status, tentativas, erro, created_at, delivered_at')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        showToast('Erro ao carregar entregas.', 'error');
        return;
      }

      setDeliveries((data as DeliveryRow[]) ?? []);
    },
    [showToast]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (logsWebhookId) {
      void loadDeliveries(logsWebhookId);
    }
  }, [logsWebhookId, loadDeliveries]);

  const validateForm = (form: typeof emptyForm) => {
    if (!form.nome.trim()) {
      showToast('Informe o nome do webhook.', 'warning');
      return false;
    }
    if (!form.url.trim() || !/^https?:\/\/.+/i.test(form.url.trim())) {
      showToast('Informe uma URL válida (http/https).', 'warning');
      return false;
    }
    if (!form.secret_key.trim()) {
      showToast('Informe a chave secreta.', 'warning');
      return false;
    }
    return true;
  };

  const saveCreate = async () => {
    if (!validateForm(createForm)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('webhooks').insert({
        nome: createForm.nome.trim(),
        url: createForm.url.trim(),
        evento: createForm.evento,
        secret_key: createForm.secret_key.trim(),
        ativo: createForm.ativo,
      });

      if (error) {
        showToast(`Erro ao criar: ${error.message}`, 'error');
        return;
      }

      showToast('Webhook criado!', 'success');
      setIsCreating(false);
      setCreateForm({ ...emptyForm, secret_key: generateWebhookSecret() });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId || !validateForm(editForm)) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('webhooks')
        .update({
          nome: editForm.nome.trim(),
          url: editForm.url.trim(),
          evento: editForm.evento,
          secret_key: editForm.secret_key.trim(),
          ativo: editForm.ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);

      if (error) {
        showToast(`Erro ao salvar: ${error.message}`, 'error');
        return;
      }

      showToast('Webhook atualizado!', 'success');
      setEditingId(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: WebhookRow) => {
    const { error } = await supabase
      .from('webhooks')
      .update({ ativo: !row.ativo, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (error) {
      showToast('Erro ao alterar status.', 'error');
      return;
    }

    await loadData();
  };

  const deleteWebhook = async (id: string) => {
    if (!window.confirm('Excluir este webhook?')) return;

    const { error } = await supabase.from('webhooks').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir webhook.', 'error');
      return;
    }

    showToast('Webhook excluído.', 'success');
    if (logsWebhookId === id) setLogsWebhookId(null);
    await loadData();
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testWebhook(id);
      showToast(`Teste enviado (HTTP ${result.http_status})`, 'success');
      if (logsWebhookId === id) await loadDeliveries(id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Falha no teste', 'error');
    } finally {
      setTestingId(null);
    }
  };

  const copySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      showToast('Chave copiada!', 'success');
    } catch {
      showToast('Não foi possível copiar.', 'error');
    }
  };

  const renderFormFields = (
    form: typeof emptyForm,
    setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>
  ) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-admin-muted mb-1">Nome</label>
        <input
          className="w-full rounded-lg bg-admin-panel-2 border border-admin-border px-3 py-2 text-admin-foreground"
          value={form.nome}
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          placeholder="Meta Ads — Registros"
        />
      </div>
      <div>
        <label className="block text-sm text-admin-muted mb-1">URL do webhook</label>
        <input
          className="w-full rounded-lg bg-admin-panel-2 border border-admin-border px-3 py-2 text-admin-foreground"
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          placeholder="https://seu-servidor.com/webhook"
        />
      </div>
      <div>
        <label className="block text-sm text-admin-muted mb-1">Evento</label>
        <select
          className="w-full rounded-lg bg-admin-panel-2 border border-admin-border px-3 py-2 text-admin-foreground"
          value={form.evento}
          onChange={(e) => setForm((f) => ({ ...f, evento: e.target.value }))}
        >
          {WEBHOOK_EVENTS.map((ev) => (
            <option key={ev.value} value={ev.value}>
              {ev.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-admin-muted mb-1">Chave secreta</label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg bg-admin-panel-2 border border-admin-border px-3 py-2 text-admin-foreground font-mono text-xs"
            value={form.secret_key}
            onChange={(e) => setForm((f) => ({ ...f, secret_key: e.target.value }))}
          />
          <Button type="button" variant="secondary" onClick={() => setForm((f) => ({ ...f, secret_key: generateWebhookSecret() }))}>
            Gerar
          </Button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-admin-foreground">
        <input
          type="checkbox"
          checked={form.ativo}
          onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
        />
        Ativo
      </label>
    </div>
  );

  return (
    <div>
      <PageHeader
        icon={Webhook}
        title="Webhooks"
        description="Dispare eventos do sistema para URLs externas (Meta Ads, n8n, Zapier). Assinatura HMAC-SHA256 no header X-Webhook-Signature."
        actions={
          <Button onClick={() => { setCreateForm({ ...emptyForm, secret_key: generateWebhookSecret() }); setIsCreating(true); }}>
            Novo webhook
          </Button>
        }
      />

      {loading ? (
        <LoadingState message="Carregando webhooks..." />
      ) : webhooks.length === 0 ? (
        <PagePanel>
          <EmptyState
            icon={Webhook}
            title="Nenhum webhook configurado"
            description="Crie um webhook para receber eventos como user.register e deposit.paid."
          />
        </PagePanel>
      ) : (
        <PagePanel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-admin-muted border-b border-admin-border">
                  <th className="py-3 pr-4">Nome</th>
                  <th className="py-3 pr-4">URL</th>
                  <th className="py-3 pr-4">Evento</th>
                  <th className="py-3 pr-4">Secret</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((row) => (
                  <tr key={row.id} className="border-b border-admin-border/60">
                    <td className="py-3 pr-4 font-medium text-admin-foreground">{row.nome}</td>
                    <td className="py-3 pr-4 max-w-[220px] truncate text-admin-muted-2" title={row.url}>{row.url}</td>
                    <td className="py-3 pr-4 text-admin-muted-2">{eventLabel(row.evento)}</td>
                    <td className="py-3 pr-4">
                      <button type="button" className="inline-flex items-center gap-1 text-xs font-mono text-admin-muted hover:text-admin-foreground" onClick={() => void copySecret(row.secret_key)}>
                        <Copy className="w-3.5 h-3.5" />
                        {row.secret_key.slice(0, 8)}…
                      </button>
                    </td>
                    <td className="py-3 pr-4">
                      <button type="button" onClick={() => void toggleActive(row)} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${row.ativo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-admin-panel-3 text-admin-muted'}`}>
                        {row.ativo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {row.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => { setEditingId(row.id); setEditForm({ nome: row.nome, url: row.url, evento: row.evento, secret_key: row.secret_key, ativo: row.ativo }); }}>
                          Editar
                        </Button>
                        <Button variant="secondary" disabled={testingId === row.id} onClick={() => void handleTest(row.id)}>
                          <Send className="w-3.5 h-3.5" />
                          {testingId === row.id ? 'Enviando…' : 'Testar'}
                        </Button>
                        <Button variant="secondary" onClick={() => setLogsWebhookId(row.id)}>
                          Logs
                        </Button>
                        <Button variant="danger" onClick={() => void deleteWebhook(row.id)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PagePanel>
      )}

      <Modal open={isCreating} onClose={() => setIsCreating(false)} title="Novo webhook">
        {renderFormFields(createForm, setCreateForm)}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setIsCreating(false)}>Cancelar</Button>
          <Button onClick={() => void saveCreate()} disabled={saving}>{saving ? 'Salvando…' : 'Criar'}</Button>
        </div>
      </Modal>

      <Modal open={!!editingId} onClose={() => setEditingId(null)} title="Editar webhook">
        {renderFormFields(editForm, setEditForm)}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setEditingId(null)}>Cancelar</Button>
          <Button onClick={() => void saveEdit()} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>
        </div>
      </Modal>

      <Modal open={!!logsWebhookId} onClose={() => setLogsWebhookId(null)} title="Entregas recentes">
        <div className="flex justify-end mb-3">
          <Button variant="secondary" onClick={() => logsWebhookId && void loadDeliveries(logsWebhookId)}>
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
        </div>
        {deliveries.length === 0 ? (
          <p className="text-admin-muted text-sm">Nenhuma entrega registrada.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {deliveries.map((d) => (
              <div key={d.id} className="rounded-lg border border-admin-border p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-medium ${d.status === 'success' ? 'text-emerald-300' : d.status === 'failed' ? 'text-red-300' : 'text-amber-300'}`}>
                    {d.status} {d.http_status ? `(HTTP ${d.http_status})` : ''}
                  </span>
                  <span className="text-admin-muted">{new Date(d.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-admin-muted mt-1">Tentativas: {d.tentativas}</p>
                {d.erro && <p className="text-red-300 mt-1">{d.erro}</p>}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
