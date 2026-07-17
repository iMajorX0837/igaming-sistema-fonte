import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import SortableOrderList from '../components/SortableOrderList';
import { applySequentialOrder } from '../lib/reorderUtils';
import { persistTableOrder } from '../lib/persistTableOrder';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { ChevronLeft, ChevronRight, Building2, Gamepad2, LayoutGrid, Pencil, Power } from 'lucide-react';
import HomeSectionGamesModal from '../components/home/HomeSectionGamesModal';
import HomeSectionProvidersModal from '../components/home/HomeSectionProvidersModal';
import { HOME_SECTION_GAMES_MAX, isHomeGameSectionType } from '../lib/homeSectionGames';
import { isEstudiosSectionType } from '../lib/homeSectionProviders';
import { getEstudiosCardBackground, getHomeSliderSurfaceBackground } from '../lib/homeTheme';

type SectionType = 'estudios' | 'recomendados' | 'jogos_semana' | 'jogos_pg' | 'jogos_mesa' | 'jogos_turbo';

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
  jogos_semana: '+ Jogados da Semana',
  jogos_pg: 'Jogos da PG',
  jogos_mesa: 'Jogos de Mesa',
  jogos_turbo: 'Jogos Turbo',
};

const defaultHomeBackground = {
  fundo: '#121319',
};

export default function HomeSectionsPage({ embedded = false }: { embedded?: boolean }) {
  const { showToast } = useToast();
  const [sections, setSections] = useState<HomeSectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [homeBackground, setHomeBackground] = useState(defaultHomeBackground);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<HomeSectionRow | null>(null);
  const [gamesModalSection, setGamesModalSection] = useState<HomeSectionRow | null>(null);
  const [providersModalSection, setProvidersModalSection] = useState<HomeSectionRow | null>(null);
  const [gamesCountBySection, setGamesCountBySection] = useState<Record<string, number>>({});
  const [providersCountBySection, setProvidersCountBySection] = useState<Record<string, number>>({});
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

  const loadGameCounts = async () => {
    const { data, error } = await supabase.from('home_section_games').select('section_id');

    if (error) {
      return;
    }

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const sectionId = String(row.section_id);
      counts[sectionId] = (counts[sectionId] || 0) + 1;
    }
    setGamesCountBySection(counts);
  };

  const loadProviderCounts = async () => {
    const { data, error } = await supabase.from('home_section_providers').select('section_id');

    if (error) {
      return;
    }

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const sectionId = String(row.section_id);
      counts[sectionId] = (counts[sectionId] || 0) + 1;
    }
    setProvidersCountBySection(counts);
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
    void loadGameCounts();
    void loadProviderCounts();
  }, []);

  const startEdit = (section: HomeSectionRow) => {
    setEditingId(section.id);
    setEditingSection(section);
    setEditForm({
      titulo: section.titulo,
      ordem: section.ordem,
      ativo: section.ativo,
      view_all_link: section.view_all_link || '',
      use_green_button: section.use_green_button,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingSection(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
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
        .eq('id', editingId);

      if (error) {
        showToast('Erro ao salvar seção.', 'error');
        return;
      }

      showToast('Seção atualizada! A ordem na home foi reorganizada.', 'success');
      cancelEdit();
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

  if (loading && !embedded) {
    return <LoadingState message="Carregando seções..." />;
  }

  const backgroundPanel = (
    <div className={`rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-5 ${embedded ? 'mb-5' : 'mb-6'}`}>
      <h2 className="text-white text-base font-semibold mb-1">Cor de fundo da Home</h2>
      <p className="text-gray-400 text-sm mb-5">Personalize a cor de fundo da página inicial do site.</p>

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
          <EstudiosCardsPreview fundo={homeBackground.fundo} />
          <Button onClick={saveHomeBackground} loading={configSaving}>
            Salvar cor
          </Button>
        </div>
      )}
    </div>
  );

  const sectionsList = loading ? (
    <LoadingState inline message="Carregando seções..." />
  ) : (
    <SortableOrderList
      items={sections}
      onReorder={handleSectionsReorder}
      disabled={editingId !== null || saving}
      className="space-y-3"
      renderItem={(section) => (
        <div className="rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-admin-accent text-xs font-bold">#{section.ordem}</span>
                <h3 className="text-white font-semibold">{section.titulo}</h3>
                <span className="text-gray-500 text-xs">({TYPE_LABELS[section.tipo]})</span>
                <StatusBadge variant={section.ativo ? 'success' : 'neutral'}>
                  {section.ativo ? 'Ativo' : 'Inativo'}
                </StatusBadge>
              </div>
              {section.view_all_link && (
                <p className="text-gray-500 text-xs">Ver tudo: {section.view_all_link}</p>
              )}
              {isHomeGameSectionType(section.tipo) && (
                <p className="text-gray-500 text-xs mt-1">
                  Jogos configurados: {gamesCountBySection[section.id] || 0}/{HOME_SECTION_GAMES_MAX}
                </p>
              )}
              {isEstudiosSectionType(section.tipo) && (
                <p className="text-gray-500 text-xs mt-1">
                  Provedores configurados: {providersCountBySection[section.id] || 0}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {isEstudiosSectionType(section.tipo) && (
                <Button
                  variant="secondary"
                  icon={Building2}
                  onClick={() => setProvidersModalSection(section)}
                  disabled={saving}
                  className="!px-3 !py-1.5 !text-xs"
                >
                  Provedores
                </Button>
              )}
              {isHomeGameSectionType(section.tipo) && (
                <Button
                  variant="secondary"
                  icon={Gamepad2}
                  onClick={() => setGamesModalSection(section)}
                  disabled={saving}
                  className="!px-3 !py-1.5 !text-xs"
                >
                  Jogos
                </Button>
              )}
              <Button
                variant="secondary"
                icon={Pencil}
                onClick={() => startEdit(section)}
                disabled={saving}
                className="!px-3 !py-1.5 !text-xs"
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                icon={Power}
                onClick={() => toggleAtivo(section)}
                disabled={saving}
                className="!px-3 !py-1.5 !text-xs"
              >
                {section.ativo ? 'Ocultar' : 'Exibir'}
              </Button>
            </div>
          </div>
        </div>
      )}
    />
  );

  const content = (
    <>
      {!embedded && (
        <PageHeader
          icon={LayoutGrid}
          title="Seções da Home"
          description="Defina a ordem das seções na home: Estúdios, Jogos Turbo, Jogos de Mesa, Jogos da PG e Recomendados. Segure o ícone à esquerda e arraste para reorganizar."
        />
      )}

      <HomeSectionProvidersModal
        open={providersModalSection !== null}
        onClose={() => setProvidersModalSection(null)}
        section={providersModalSection}
        onSaved={() => {
          void loadProviderCounts();
        }}
      />

      <HomeSectionGamesModal
        open={gamesModalSection !== null}
        onClose={() => setGamesModalSection(null)}
        section={gamesModalSection}
        onSaved={() => {
          void loadGameCounts();
        }}
      />

      <Modal
        open={editingId !== null && editingSection !== null}
        onClose={cancelEdit}
        title={editingSection ? `Editar: ${TYPE_LABELS[editingSection.tipo]}` : 'Editar seção'}
        description="Configure título, ordem e opções de exibição da seção na home."
        icon={Pencil}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} loading={saving}>
              Salvar alterações
            </Button>
          </>
        }
      >
        {editingSection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Título exibido" value={editForm.titulo} onChange={(v) => setEditForm({ ...editForm, titulo: v })} />
            <Field
              label="Ordem (1 = primeiro)"
              type="number"
              value={String(editForm.ordem)}
              onChange={(v) => setEditForm({ ...editForm, ordem: Number(v) })}
            />
            {(editingSection.tipo === 'estudios' || editingSection.tipo.startsWith('jogos_')) && (
              <Field
                label="Link Ver Tudo"
                value={editForm.view_all_link}
                onChange={(v) => setEditForm({ ...editForm, view_all_link: v })}
                className="md:col-span-2"
                placeholder="/providers"
              />
            )}
            {editingSection.tipo.startsWith('jogos_') && (
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
        )}
      </Modal>

      {embedded ? (
        <>
          {backgroundPanel}
          {sectionsList}
        </>
      ) : (
        <>
          {backgroundPanel}
          <PagePanel padding={false} className="p-0 border-0 bg-transparent shadow-none">
            {sectionsList}
          </PagePanel>
        </>
      )}
    </>
  );

  return embedded ? content : <div>{content}</div>;
}

function HomeSliderControlsPreview({ fundo }: { fundo: string }) {
  const surfaceBg = getHomeSliderSurfaceBackground(fundo);

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

function EstudiosCardsPreview({ fundo }: { fundo: string }) {
  const cardBg = getEstudiosCardBackground(fundo);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-gray-400 text-xs">Cards da seção Estúdios</span>
      <div
        className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2"
        style={{ backgroundColor: fundo }}
      >
        {[1, 2, 3].map((item) => (
          <span
            key={item}
            className="h-10 w-24 rounded-lg border border-white/5 shrink-0"
            style={{ backgroundColor: cardBg }}
          />
        ))}
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
