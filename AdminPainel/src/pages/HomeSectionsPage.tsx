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
import { ChevronLeft, ChevronRight, Building2, Gamepad2, LayoutGrid, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
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

const TYPE_DEFAULTS: Record<
  SectionType,
  { titulo: string; slug: string; view_all_link: string | null; use_green_button: boolean }
> = {
  estudios: { titulo: 'Estúdios', slug: 'estudios', view_all_link: '/providers', use_green_button: false },
  recomendados: { titulo: 'Recomendados', slug: 'recomendados', view_all_link: null, use_green_button: false },
  jogos_semana: {
    titulo: '+ Jogados da Semana',
    slug: 'jogos-semana',
    view_all_link: '/games',
    use_green_button: false,
  },
  jogos_pg: { titulo: 'Jogos da PG', slug: 'jogos-pg', view_all_link: '/list/mais-jogados', use_green_button: false },
  jogos_mesa: { titulo: 'Jogos de Mesa', slug: 'jogos-mesa', view_all_link: '/list/pg-soft', use_green_button: false },
  jogos_turbo: {
    titulo: 'Jogos Turbo',
    slug: 'jogos-turbo',
    view_all_link: '/provider/pragmatic',
    use_green_button: true,
  },
};

function slugifySection(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function createFormFromType(tipo: SectionType, sections: HomeSectionRow[] = []) {
  const defaults = TYPE_DEFAULTS[tipo];
  return {
    tipo,
    titulo: suggestSectionTitle(tipo, sections),
    slug: suggestSectionSlug(tipo, sections),
    ativo: true,
    view_all_link: defaults.view_all_link || '',
    use_green_button: defaults.use_green_button,
  };
}

function suggestSectionSlug(tipo: SectionType, sections: HomeSectionRow[]): string {
  const base = TYPE_DEFAULTS[tipo].slug;
  const usedSlugs = new Set(sections.map((section) => section.slug));
  if (!usedSlugs.has(base)) return base;

  let index = 2;
  while (usedSlugs.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

function suggestSectionTitle(tipo: SectionType, sections: HomeSectionRow[]): string {
  const base = TYPE_DEFAULTS[tipo].titulo;
  const sameTypeCount = sections.filter((section) => section.tipo === tipo).length;
  if (sameTypeCount === 0) return base;
  return `${base} ${sameTypeCount + 1}`;
}

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
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
  const [createForm, setCreateForm] = useState(createFormFromType('jogos_pg'));

  const modalBusy = editingId !== null || isCreating || saving || deletingId !== null;
  const sectionToDelete = sections.find((section) => section.id === deletingId) ?? null;

  const loadHomeBackground = async () => {
    try {
      setConfigLoading(true);
      const { data, error } = await supabase.from('site_config').select('home_fundo').eq('id', 1).maybeSingle();

      if (error) {
        showToast('Erro ao carregar cor da home. Execute deploy/supabase_nova_casa.sql no Supabase.', 'error');
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
      const { data, error } = await supabase
        .from('home_sections')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) {
        showToast('Execute deploy/supabase_nova_casa.sql no Supabase.', 'error');
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

  const startCreate = () => {
    setCreateForm(createFormFromType('jogos_pg', sections));
    setIsCreating(true);
  };

  const cancelCreate = () => {
    setIsCreating(false);
  };

  const saveCreate = async () => {
    if (!createForm.titulo.trim()) {
      showToast('Informe o título da seção.', 'error');
      return;
    }

    const slug = (createForm.slug.trim() || slugifySection(createForm.titulo)).trim();
    if (!slug) {
      showToast('Informe um slug válido para a seção.', 'error');
      return;
    }

    const slugTaken = sections.some((section) => section.slug === slug);
    if (slugTaken) {
      showToast('Já existe uma seção com esse slug.', 'error');
      return;
    }

    const nextOrder =
      sections.length > 0 ? Math.max(...sections.map((section) => section.ordem)) + 1 : 1;

    setSaving(true);
    try {
      const { error } = await supabase.from('home_sections').insert({
        slug,
        titulo: createForm.titulo.trim(),
        tipo: createForm.tipo,
        ordem: nextOrder,
        ativo: createForm.ativo,
        view_all_link: createForm.view_all_link.trim() || null,
        use_green_button: createForm.use_green_button,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === '23505') {
          showToast('Já existe uma seção com esse slug.', 'error');
        } else {
          showToast('Erro ao criar seção. Execute deploy/supabase_nova_casa.sql no Supabase.', 'error');
        }
        return;
      }

      showToast('Seção criada!', 'success');
      cancelCreate();
      await loadSections();
    } finally {
      setSaving(false);
    }
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

      showToast('Seção atualizada!', 'success');
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

  const deleteSection = async () => {
    if (!deletingId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('home_sections').delete().eq('id', deletingId);

      if (error) {
        showToast('Erro ao excluir seção.', 'error');
        return;
      }

      if (editingId === deletingId) cancelEdit();
      if (gamesModalSection?.id === deletingId) setGamesModalSection(null);
      if (providersModalSection?.id === deletingId) setProvidersModalSection(null);

      showToast('Seção excluída!', 'success');
      setDeletingId(null);
      await loadSections();
      await loadGameCounts();
      await loadProviderCounts();
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
  ) : sections.length === 0 ? (
    <EmptyState
      icon={LayoutGrid}
      title="Nenhuma seção cadastrada."
      description="Adicione uma seção para montar a home."
      action={
        <Button icon={Plus} onClick={startCreate} disabled={modalBusy || loading}>
          Nova seção
        </Button>
      }
    />
  ) : (
    <SortableOrderList
      items={sections}
      onReorder={handleSectionsReorder}
      disabled={modalBusy}
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
                <>
                  <p className="text-gray-500 text-xs mt-1">
                    Jogos configurados: {gamesCountBySection[section.id] || 0}/{HOME_SECTION_GAMES_MAX}
                  </p>
                  {(gamesCountBySection[section.id] || 0) === 0 && (
                    <p className="text-amber-400 text-xs mt-1">
                      Sem jogos — esta seção não aparece na home. Clique em Jogos para adicionar.
                    </p>
                  )}
                </>
              )}
              {isEstudiosSectionType(section.tipo) && (
                <>
                  <p className="text-gray-500 text-xs mt-1">
                    Provedores configurados: {providersCountBySection[section.id] || 0}
                  </p>
                  {(providersCountBySection[section.id] || 0) === 0 && (
                    <p className="text-amber-400 text-xs mt-1">
                      Sem provedores — a seção usa fallback da API ou fica vazia no site.
                    </p>
                  )}
                </>
              )}
              {!section.ativo && (
                <p className="text-amber-400 text-xs mt-1">Seção inativa — não aparece na home.</p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {isEstudiosSectionType(section.tipo) && (
                <Button
                  variant="secondary"
                  icon={Building2}
                  onClick={() => setProvidersModalSection(section)}
                  disabled={modalBusy}
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
                  disabled={modalBusy}
                  className="!px-3 !py-1.5 !text-xs"
                >
                  Jogos
                </Button>
              )}
              <Button
                variant="secondary"
                icon={Pencil}
                onClick={() => startEdit(section)}
                disabled={modalBusy}
                className="!px-3 !py-1.5 !text-xs"
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                icon={Power}
                onClick={() => toggleAtivo(section)}
                disabled={modalBusy}
                className="!px-3 !py-1.5 !text-xs"
              >
                {section.ativo ? 'Ocultar' : 'Exibir'}
              </Button>
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => setDeletingId(section.id)}
                disabled={modalBusy}
                className="!px-3 !py-1.5 !text-xs"
              >
                Excluir
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
          actions={
            <Button icon={Plus} onClick={startCreate} disabled={modalBusy || loading}>
              Nova seção
            </Button>
          }
        />
      )}

      {embedded && sections.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2 mb-4">
          <Button icon={Plus} onClick={startCreate} disabled={modalBusy || loading}>
            Nova seção
          </Button>
        </div>
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
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Excluir seção"
        description="Esta ação não pode ser desfeita."
        icon={Trash2}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingId(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={deleteSection} loading={saving}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-gray-300 text-sm">
          Deseja excluir a seção{' '}
          <span className="text-white font-medium">{sectionToDelete?.titulo || 'selecionada'}</span>?
          Jogos e provedores vinculados também serão removidos.
        </p>
      </Modal>

      <Modal
        open={isCreating}
        onClose={cancelCreate}
        title="Nova seção"
        description="Escolha o tipo da seção e configure como ela aparecerá na home."
        icon={Plus}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={cancelCreate} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveCreate} loading={saving}>
              Criar seção
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-gray-300 text-sm mb-1 block">Tipo da seção</label>
            <select
              value={createForm.tipo}
              onChange={(e) => {
                const tipo = e.target.value as SectionType;
                setCreateForm(createFormFromType(tipo, sections));
              }}
              className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
            >
              {(Object.keys(TYPE_LABELS) as SectionType[]).map((tipo) => (
                <option key={tipo} value={tipo}>
                  {TYPE_LABELS[tipo]}
                </option>
              ))}
            </select>
          </div>

          <Field
            label="Título exibido"
            value={createForm.titulo}
            onChange={(v) =>
              setCreateForm((prev) => ({
                ...prev,
                titulo: v,
                slug: prev.slug === slugifySection(prev.titulo) ? slugifySection(v) : prev.slug,
              }))
            }
          />

          <Field
            label="Slug (identificador interno)"
            value={createForm.slug}
            onChange={(v) => setCreateForm((prev) => ({ ...prev, slug: slugifySection(v) }))}
            placeholder="jogos-pg"
          />

          {(createForm.tipo === 'estudios' || createForm.tipo.startsWith('jogos_')) && (
            <Field
              label="Link Ver Tudo"
              value={createForm.view_all_link}
              onChange={(v) => setCreateForm((prev) => ({ ...prev, view_all_link: v }))}
              className="md:col-span-2"
              placeholder="/providers"
            />
          )}

          {createForm.tipo.startsWith('jogos_') && (
            <label className="flex items-center gap-2 text-gray-300 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={createForm.use_green_button}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, use_green_button: e.target.checked }))}
                className="rounded"
              />
              Botão JOGAR verde
            </label>
          )}

          <label className="flex items-center gap-2 text-gray-300 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={createForm.ativo}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, ativo: e.target.checked }))}
              className="rounded"
            />
            Exibir na home
          </label>
        </div>
      </Modal>

      <Modal
        open={editingId !== null && editingSection !== null}
        onClose={cancelEdit}
        title={editingSection ? `Editar: ${TYPE_LABELS[editingSection.tipo]}` : 'Editar seção'}
        description="Configure título e opções de exibição da seção na home."
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
