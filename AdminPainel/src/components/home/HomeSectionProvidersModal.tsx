import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, GripVertical, Search, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingState from '../ui/LoadingState';
import SortableOrderList from '../SortableOrderList';
import {
  fetchProviders,
  isPlayFiverEnabledProvider,
  normalizeProviderName,
} from '../../lib/playfiversApi';
import { PROPRIETARY_PROVIDER, PROPRIETARY_PROVIDER_ID } from '../../lib/proprietaryCatalog';
import {
  catalogProviderKey,
  type CatalogProviderOption,
  type HomeSectionProviderRow,
} from '../../lib/homeSectionProviders';

interface HomeSectionProvidersModalProps {
  open: boolean;
  onClose: () => void;
  section: { id: string; titulo: string } | null;
  onSaved?: () => void;
}

function rowToCatalog(row: HomeSectionProviderRow): CatalogProviderOption {
  return {
    key: catalogProviderKey(row.api_provider_id),
    api_provider_id: row.api_provider_id,
    provider_name: row.provider_name,
    provider_image_url: row.provider_image_url || '',
  };
}

export default function HomeSectionProvidersModal({
  open,
  onClose,
  section,
  onSaved,
}: HomeSectionProvidersModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalogProviders, setCatalogProviders] = useState<CatalogProviderOption[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<CatalogProviderOption[]>([]);

  const selectedKeys = useMemo(
    () => new Set(selectedProviders.map((provider) => provider.key)),
    [selectedProviders]
  );

  const loadInitialData = useCallback(async () => {
    if (!section) return;

    setLoading(true);
    try {
      const [providersRes, savedRes] = await Promise.all([
        fetchProviders(),
        supabase
          .from('home_section_providers')
          .select('*')
          .eq('section_id', section.id)
          .order('ordem', { ascending: true }),
      ]);

      if (providersRes.status !== 1 || !providersRes.data) {
        throw new Error(providersRes.msg || 'Erro ao carregar provedores.');
      }

      if (savedRes.error) {
        throw new Error('Execute deploy/supabase_nova_casa.sql no Supabase.');
      }

      const allProviders: CatalogProviderOption[] = [
        {
          key: catalogProviderKey(PROPRIETARY_PROVIDER_ID),
          api_provider_id: PROPRIETARY_PROVIDER_ID,
          provider_name: PROPRIETARY_PROVIDER.name,
          provider_image_url: PROPRIETARY_PROVIDER.image_url,
        },
        ...providersRes.data.filter(isPlayFiverEnabledProvider).map((provider) => ({
          key: catalogProviderKey(provider.id),
          api_provider_id: provider.id,
          provider_name: normalizeProviderName(provider.name),
          provider_image_url: provider.image_url || '',
        })),
      ];

      setCatalogProviders(allProviders);

      const savedRows = ((savedRes.data || []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        section_id: String(row.section_id),
        api_provider_id: Number(row.api_provider_id),
        provider_name: String(row.provider_name),
        provider_image_url: row.provider_image_url ? String(row.provider_image_url) : null,
        ordem: Number(row.ordem) || 0,
      })) as HomeSectionProviderRow[];

      setSelectedProviders(savedRows.map(rowToCatalog));
      setSearch('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao carregar provedores da seção.', 'error');
    } finally {
      setLoading(false);
    }
  }, [section, showToast]);

  useEffect(() => {
    if (open && section) {
      void loadInitialData();
    }
  }, [open, section, loadInitialData]);

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return catalogProviders;
    return catalogProviders.filter((provider) => provider.provider_name.toLowerCase().includes(term));
  }, [catalogProviders, search]);

  const toggleProvider = (provider: CatalogProviderOption) => {
    if (selectedKeys.has(provider.key)) {
      setSelectedProviders((prev) => prev.filter((item) => item.key !== provider.key));
      return;
    }

    setSelectedProviders((prev) => [...prev, provider]);
  };

  const removeProvider = (key: string) => {
    setSelectedProviders((prev) => prev.filter((provider) => provider.key !== key));
  };

  const saveProviders = async () => {
    if (!section) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('home_section_providers')
        .delete()
        .eq('section_id', section.id);

      if (deleteError) {
        showToast('Erro ao salvar provedores da seção.', 'error');
        return;
      }

      if (selectedProviders.length > 0) {
        const payload = selectedProviders.map((provider, index) => ({
          section_id: section.id,
          api_provider_id: provider.api_provider_id,
          provider_name: provider.provider_name,
          provider_image_url: provider.provider_image_url || null,
          ordem: index + 1,
          updated_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase.from('home_section_providers').insert(payload);
        if (insertError) {
          showToast('Erro ao salvar provedores da seção.', 'error');
          return;
        }
      }

      showToast('Provedores da seção salvos!', 'success');
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const sortableSelected = selectedProviders.map((provider) => ({ ...provider, id: provider.key }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={section ? `Provedores: ${section.titulo}` : 'Provedores da seção'}
      description="Selecione quais estúdios aparecem na seção Estúdios da home. Arraste os selecionados para definir a ordem."
      icon={Building2}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={saveProviders} loading={saving} disabled={loading}>
            Salvar provedores
          </Button>
        </>
      }
    >
      {loading ? (
        <LoadingState inline message="Carregando seção..." />
      ) : (
        <div className="space-y-5">
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">
              Selecionados ({selectedProviders.length})
            </h4>

            {selectedProviders.length === 0 ? (
              <p className="text-gray-500 text-sm rounded-lg border border-dashed border-admin-border px-4 py-6 text-center">
                Nenhum provedor selecionado. Escolha estúdios na lista abaixo.
              </p>
            ) : (
              <SortableOrderList
                items={sortableSelected}
                onReorder={(items) => setSelectedProviders(items)}
                disabled={saving}
                className="space-y-2 max-h-52 overflow-y-auto pr-1"
                renderItem={(provider) => (
                  <div className="flex items-center gap-3 rounded-lg border border-admin-border bg-admin-panel-2/60 px-3 py-2">
                    <GripVertical className="w-4 h-4 text-gray-500 shrink-0" />
                    <img
                      src={provider.provider_image_url}
                      alt={provider.provider_name}
                      className="w-10 h-10 rounded object-contain bg-black/30 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{provider.provider_name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProvider(provider.key)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      aria-label={`Remover ${provider.provider_name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              />
            )}
          </div>

          <div>
            <label className="text-gray-300 text-sm mb-1 block">Buscar provedora</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome do estúdio..."
                className="w-full pl-9 pr-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
              />
            </div>
          </div>

          <div className="max-h-[340px] overflow-y-auto rounded-xl border border-admin-border bg-admin-panel-2/30 p-3">
            {filteredCatalog.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Nenhum provedor encontrado.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredCatalog.map((provider) => {
                  const isSelected = selectedKeys.has(provider.key);

                  return (
                    <button
                      key={provider.key}
                      type="button"
                      onClick={() => toggleProvider(provider)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        isSelected
                          ? 'border-admin-accent bg-admin-accent/10'
                          : 'border-admin-border hover:border-admin-accent/40 hover:bg-admin-panel-2/80'
                      }`}
                    >
                      <img
                        src={provider.provider_image_url}
                        alt={provider.provider_name}
                        className="w-full h-12 object-contain mb-2"
                      />
                      <p className="text-white text-xs font-medium line-clamp-2">{provider.provider_name}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
