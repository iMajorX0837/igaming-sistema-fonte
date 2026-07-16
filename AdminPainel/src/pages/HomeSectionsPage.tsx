import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import SortableOrderList from '../components/SortableOrderList';
import { applySequentialOrder } from '../lib/reorderUtils';
import { persistTableOrder } from '../lib/persistTableOrder';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';

type SectionType = 'estudios' | 'recomendados' | 'jogos_pg' | 'jogos_mesa' | 'jogos_turbo';

interface HomeSectionRow {
  id: string;
  slug: string;
  titulo: string;
  tipo: SectionType;
  ordem: number;
  ativo: boolean;
  view_all_link: string | null;
  use_green_button: boolean;
}

const TYPE_LABELS: Record<SectionType, string> = {
  estudios: 'Estúdios (provedores)',
  recomendados: 'Recomendados (banners)',
  jogos_pg: 'Jogos da PG',
  jogos_mesa: 'Jogos de Mesa',
  jogos_turbo: 'Jogos Turbo',
};

const defaultHomeBackground = {
  fundo: '#121319',
};

export default function HomeSectionsPage() {
  const { showToast } = useToast();
  const [sections, setSections] = useState<HomeSectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [homeBackground, setHomeBackground] = useState(defaultHomeBackground);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    titulo: '',
    ordem: 1,
    ativo: true,
    view_all_link: '',
    use_green_button: false,
  });

  const loadHomeBackground = async () => {
    try {
      setConfigLoading(true);
      const { data, error } = await supabase.from('site_config').select('home_fundo').eq('id', 1).maybeSingle();

      if (error) {
        showToast('Erro ao carregar cor da home. Execute site_config.sql.', 'error');
        return;
      }

      if (data) {
        setHomeBackground({
          fundo: String(data.home_fundo || defaultHomeBackground.fundo),
        });
      }
    } finally {
      setConfigLoading(false);
    }
  };

  const saveHomeBackground = async () => {
    setConfigSaving(true);
    try {
      const { error } = await supabase.from('site_config').upsert({
        id: 1,
        home_fundo: homeBackground.fundo.trim(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        showToast('Erro ao salvar cor da home.', 'error');
        return;
      }

      showToast('Cor da home salva!', 'success');
    } catch {
      showToast('Erro ao salvar cor da home.', 'error');
    } finally {
      setConfigSaving(false);
    }
  };

  const loadSections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('home_sections')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) {
        showToast('Execute home_sections.sql no Supabase.', 'error');
        return;
      }

      setSections(
        ((data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          slug: String(row.slug),
          titulo: String(row.titulo),
          tipo: row.tipo as SectionType,
          ordem: Number(row.ordem) || 0,
          ativo: Boolean(row.ativo),
          view_all_link: row.view_all_link ? String(row.view_all_link) : null,
          use_green_button: Boolean(row.use_green_button),
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHomeBackground();
    void loadSections();
  }, []);

  const startEdit = (section: HomeSectionRow) => {
    setEditingId(section.id);
    setEditForm({
      titulo: section.titulo,
      ordem: section.ordem,
      ativo: section.ativo,
      view_all_link: section.view_all_link || '',
      use_green_button: section.use_green_button,
    });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.titulo.trim()) {
      showToast('Informe o título da seção.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('home_sections')
        .update({
          titulo: editForm.titulo.trim(),
          ordem: editForm.ordem,
          ativo: editForm.ativo,
          view_all_link: editForm.view_all_link.trim() || null,
          use_green_button: editForm.use_green_button,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        showToast('Erro ao salvar seção.', 'error');
        return;
      }

      showToast('Seção atualizada! A ordem na home foi reorganizada.', 'success');
      setEditingId(null);
      await loadSections();
    } finally {
      setSaving(false);
    }
  };

  const handleSectionsReorder = async (reordered: HomeSectionRow[]) => {
    const withOrder = applySequentialOrder(reordered);
    setSections(withOrder);
    try {
      await persistTableOrder('home_sections', withOrder.map((section) => section.id));
      showToast('Ordem das seções atualizada!', 'success');
    } catch {
      showToast('Erro ao salvar ordem das seções.', 'error');
      await loadSections();
    }
  };

  const toggleAtivo = async (section: HomeSectionRow) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('home_sections')
        .update({ ativo: !section.ativo, updated_at: new Date().toISOString() })
        .eq('id', section.id);

      if (error) {
        showToast('Erro ao alterar status.', 'error');
        return;
      }

      showToast(section.ativo ? 'Seção ocultada da home.' : 'Seção exibida na home.', 'success');
      await loadSections();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando seções..." />;
  }

  return (
    <div>
      <PageHeader
        icon={LayoutGrid}
        title="Seções da Home"
        description="Defina a ordem das seções na home: Estúdios, Jogos Turbo, Jogos de Mesa, Jogos da PG e Recomendados. Segure o ícone à esquerda e arraste para reorganizar."
      />

      <PagePanel className="mb-6">
        <h2 className="text-white text-lg font-semibold mb-1">Cor de fundo da Home</h2>
        <p className="text-gray-400 text-sm mb-5">
          Personalize a cor de fundo da página inicial do site.
        </p>

        {configLoading ? (
          <LoadingState inline message="Carregando cores..." />
        ) : (
          <div className="flex items-end gap-4 flex-wrap">
            <ColorField
              label="Fundo da home"
              value={homeBackground.fundo}
              onChange={(v) => setHomeBackground({ fundo: v })}
            />
            <div
              className="w-40 h-16 rounded-lg border border-white/10 shrink-0"
              style={{ backgroundColor: homeBackground.fundo }}
            />
            <HomeSliderControlsPreview fundo={homeBackground.fundo} />
            <button
              onClick={saveHomeBackground}
              disabled={configSaving}
              className="px-4 py-2 rounded-lg bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm font-medium disabled:opacity-50"
            >
              {configSaving ? 'Salvando...' : 'Salvar cor da home'}
            </button>
          </div>
        )}
      </PagePanel>

      <SortableOrderList
        items={sections}
        onReorder={handleSectionsReorder}
        disabled={editingId !== null || saving}
        renderItem={(section) => (
          <PagePanel className="p-4 md:p-5">
            {editingId === section.id ? (
              <div className="space-y-3">
                <h3 className="text-white font-semibold">Editar: {TYPE_LABELS[section.tipo]}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Título exibido" value={editForm.titulo} onChange={(v) => setEditForm({ ...editForm, titulo: v })} />
                  <Field label="Ordem (1 = primeiro)" type="number" value={String(editForm.ordem)} onChange={(v) => setEditForm({ ...editForm, ordem: Number(v) })} />
                  {(section.tipo === 'estudios' || section.tipo.startsWith('jogos_')) && (
                    <Field
                      label="Link Ver Tudo"
                      value={editForm.view_all_link}
                      onChange={(v) => setEditForm({ ...editForm, view_all_link: v })}
                      className="md:col-span-2"
                      placeholder="/providers"
                    />
                  )}
                  {section.tipo.startsWith('jogos_') && (
                    <label className="flex items-center gap-2 text-gray-300 text-sm md:col-span-2">
                      <input
                        type="checkbox"
                        checked={editForm.use_green_button}
                        onChange={(e) => setEditForm({ ...editForm, use_green_button: e.target.checked })}
                        className="rounded"
                      />
                      Botão JOGAR verde
                    </label>
                  )}
                  <label className="flex items-center gap-2 text-gray-300 text-sm">
                    <input
                      type="checkbox"
                      checked={editForm.ativo}
                      onChange={(e) => setEditForm({ ...editForm, ativo: e.target.checked })}
                      className="rounded"
                    />
                    Ativo na home
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(section.id)} disabled={saving} className="px-3 py-1.5 rounded bg-admin-info hover:bg-admin-info/90 text-white text-xs font-medium disabled:opacity-50">
                    Salvar
                  </button>
                  <button onClick={() => setEditingId(null)} disabled={saving} className="px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-admin-accent text-xs font-bold">#{section.ordem}</span>
                    <h3 className="text-white font-semibold">{section.titulo}</h3>
                    <span className="text-gray-500 text-xs">({TYPE_LABELS[section.tipo]})</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${section.ativo ? 'bg-green-900/50 text-admin-success' : 'bg-gray-700 text-gray-400'}`}>
                      {section.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {section.view_all_link && (
                    <p className="text-gray-500 text-xs">Ver tudo: {section.view_all_link}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(section)} disabled={saving} className="px-3 py-1.5 rounded bg-admin-info hover:bg-admin-info/90 text-white text-xs font-medium disabled:opacity-50">
                    Editar ordem
                  </button>
                  <button onClick={() => toggleAtivo(section)} disabled={saving} className="px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium disabled:opacity-50">
                    {section.ativo ? 'Ocultar' : 'Exibir'}
                  </button>
                </div>
              </div>
            )}
          </PagePanel>
        )}
      />
    </div>
  );
}

function HomeSliderControlsPreview({ fundo }: { fundo: string }) {
  const surfaceBg = `color-mix(in srgb, ${fundo} 88%, black)`;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-gray-400 text-xs">Botões dos sliders</span>
      <div
        className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2"
        style={{ backgroundColor: fundo }}
      >
        <span
          className="px-3 h-9 rounded-lg text-xs font-semibold flex items-center text-slate-300"
          style={{ backgroundColor: surfaceBg }}
        >
          Ver Tudo
        </span>
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300"
          style={{ backgroundColor: surfaceBg }}
        >
          <ChevronLeft className="w-4 h-4" />
        </span>
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300"
          style={{ backgroundColor: surfaceBg }}
        >
          <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-gray-300 text-sm mb-1 block">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#121319'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded border border-admin-border-strong bg-admin-panel cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-gray-300 text-sm mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
      />
    </div>
  );
}
