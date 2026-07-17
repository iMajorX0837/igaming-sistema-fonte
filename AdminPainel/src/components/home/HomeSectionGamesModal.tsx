import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gamepad2, GripVertical, Search, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import LoadingState from '../ui/LoadingState';
import SortableOrderList from '../SortableOrderList';
import {
  fetchGamesForProvider,
  fetchProviders,
  isPlayFiverEnabledProvider,
  normalizeProviderName,
} from '../../lib/playfiversApi';
import {
  PROPRIETARY_GAMES,
  PROPRIETARY_PROVIDER,
  PROPRIETARY_PROVIDER_ID,
} from '../../lib/proprietaryCatalog';
import {
  catalogGameKey,
  HOME_SECTION_GAMES_MAX,
  type CatalogGameOption,
  type HomeSectionGameRow,
} from '../../lib/homeSectionGames';

interface HomeSectionGamesModalProps {
  open: boolean;
  onClose: () => void;
  section: { id: string; titulo: string } | null;
  onSaved?: () => void;
}

interface ProviderOption {
  id: number;
  name: string;
}

function rowToCatalog(row: HomeSectionGameRow): CatalogGameOption {
  return {
    key: catalogGameKey(row.api_provider_id, row.game_code),
    api_provider_id: row.api_provider_id,
    provider_name: row.provider_name,
    game_code: row.game_code,
    game_name: row.game_name,
    game_image_url: row.game_image_url || '',
  };
}

export default function HomeSectionGamesModal({
  open,
  onClose,
  section,
  onSaved,
}: HomeSectionGamesModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<number | 'all'>('all');
  const [catalogGames, setCatalogGames] = useState<CatalogGameOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGames, setSelectedGames] = useState<CatalogGameOption[]>([]);

  const selectedKeys = useMemo(
    () => new Set(selectedGames.map((game) => game.key)),
    [selectedGames]
  );

  const loadInitialData = useCallback(async () => {
    if (!section) return;

    setLoading(true);
    try {
      const [providersRes, gamesRes] = await Promise.all([
        fetchProviders(),
        supabase
          .from('home_section_games')
          .select('*')
          .eq('section_id', section.id)
          .order('ordem', { ascending: true }),
      ]);

      if (providersRes.status !== 1 || !providersRes.data) {
        throw new Error(providersRes.msg || 'Erro ao carregar provedores.');
      }

      if (gamesRes.error) {
        throw new Error('Execute home_section_games.sql no Supabase.');
      }

      const apiProviders: ProviderOption[] = providersRes.data
        .filter(isPlayFiverEnabledProvider)
        .map((provider) => ({
          id: provider.id,
          name: normalizeProviderName(provider.name),
        }));

      const proprietaryProvider: ProviderOption = {
        id: PROPRIETARY_PROVIDER_ID,
        name: PROPRIETARY_PROVIDER.name,
      };

      setProviders([proprietaryProvider, ...apiProviders]);

      const savedRows = ((gamesRes.data || []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        section_id: String(row.section_id),
        api_provider_id: Number(row.api_provider_id),
        game_code: String(row.game_code),
        game_name: String(row.game_name),
        game_image_url: row.game_image_url ? String(row.game_image_url) : null,
        provider_name: String(row.provider_name),
        ordem: Number(row.ordem) || 0,
      })) as HomeSectionGameRow[];

      setSelectedGames(savedRows.map(rowToCatalog));
      setSelectedProviderId(apiProviders[0]?.id ?? proprietaryProvider.id);
      setSearch('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao carregar jogos da seção.', 'error');
    } finally {
      setLoading(false);
    }
  }, [section, showToast]);

  useEffect(() => {
    if (open && section) {
      void loadInitialData();
    }
  }, [open, section, loadInitialData]);

  const loadCatalogForProvider = useCallback(
    async (providerId: number) => {
      setCatalogLoading(true);
      try {
        if (providerId === PROPRIETARY_PROVIDER_ID) {
          setCatalogGames(
            PROPRIETARY_GAMES.filter((game) => game.api_status).map((game) => ({
              key: catalogGameKey(PROPRIETARY_PROVIDER_ID, game.game_code),
              api_provider_id: PROPRIETARY_PROVIDER_ID,
              provider_name: PROPRIETARY_PROVIDER.name,
              game_code: game.game_code,
              game_name: game.nome,
              game_image_url: game.image_url,
            }))
          );
          return;
        }

        const gamesRes = await fetchGamesForProvider(providerId);
        if (gamesRes.status !== 1 || !gamesRes.data) {
          setCatalogGames([]);
          return;
        }

        const providerName =
          providers.find((provider) => provider.id === providerId)?.name || 'Provedor';

        setCatalogGames(
          gamesRes.data
            .filter((game) => game.status)
            .map((game) => ({
              key: catalogGameKey(providerId, game.game_code),
              api_provider_id: providerId,
              provider_name: normalizeProviderName(game.provider.name) || providerName,
              game_code: game.game_code,
              game_name: game.name,
              game_image_url: game.image_url,
            }))
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao carregar jogos.', 'error');
        setCatalogGames([]);
      } finally {
        setCatalogLoading(false);
      }
    },
    [providers, showToast]
  );

  useEffect(() => {
    if (!open || providers.length === 0) return;

    if (selectedProviderId === 'all') {
      setCatalogLoading(true);
      void (async () => {
        const batches = await Promise.all(
          providers.map(async (provider) => {
            if (provider.id === PROPRIETARY_PROVIDER_ID) {
              return PROPRIETARY_GAMES.filter((game) => game.api_status).map((game) => ({
                key: catalogGameKey(PROPRIETARY_PROVIDER_ID, game.game_code),
                api_provider_id: PROPRIETARY_PROVIDER_ID,
                provider_name: PROPRIETARY_PROVIDER.name,
                game_code: game.game_code,
                game_name: game.nome,
                game_image_url: game.image_url,
              }));
            }

            try {
              const gamesRes = await fetchGamesForProvider(provider.id);
              if (gamesRes.status !== 1 || !gamesRes.data) return [];
              return gamesRes.data
                .filter((game) => game.status)
                .map((game) => ({
                  key: catalogGameKey(provider.id, game.game_code),
                  api_provider_id: provider.id,
                  provider_name: normalizeProviderName(game.provider.name) || provider.name,
                  game_code: game.game_code,
                  game_name: game.name,
                  game_image_url: game.image_url,
                }));
            } catch {
              return [];
            }
          })
        );
        setCatalogGames(batches.flat());
        setCatalogLoading(false);
      })();
      return;
    }

    void loadCatalogForProvider(selectedProviderId);
  }, [open, providers, selectedProviderId, loadCatalogForProvider]);

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return catalogGames;
    return catalogGames.filter(
      (game) =>
        game.game_name.toLowerCase().includes(term) ||
        game.provider_name.toLowerCase().includes(term) ||
        game.game_code.toLowerCase().includes(term)
    );
  }, [catalogGames, search]);

  const toggleGame = (game: CatalogGameOption) => {
    if (selectedKeys.has(game.key)) {
      setSelectedGames((prev) => prev.filter((item) => item.key !== game.key));
      return;
    }

    if (selectedGames.length >= HOME_SECTION_GAMES_MAX) {
      showToast(`Máximo de ${HOME_SECTION_GAMES_MAX} jogos por seção.`, 'error');
      return;
    }

    setSelectedGames((prev) => [...prev, game]);
  };

  const removeGame = (key: string) => {
    setSelectedGames((prev) => prev.filter((game) => game.key !== key));
  };

  const saveGames = async () => {
    if (!section) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('home_section_games')
        .delete()
        .eq('section_id', section.id);

      if (deleteError) {
        showToast('Erro ao salvar jogos da seção.', 'error');
        return;
      }

      if (selectedGames.length > 0) {
        const payload = selectedGames.map((game, index) => ({
          section_id: section.id,
          api_provider_id: game.api_provider_id,
          game_code: game.game_code,
          game_name: game.game_name,
          game_image_url: game.game_image_url || null,
          provider_name: game.provider_name,
          ordem: index + 1,
          updated_at: new Date().toISOString(),
        }));

        const { error: insertError } = await supabase.from('home_section_games').insert(payload);
        if (insertError) {
          showToast('Erro ao salvar jogos da seção.', 'error');
          return;
        }
      }

      showToast('Jogos da seção salvos!', 'success');
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const sortableSelected = selectedGames.map((game) => ({ ...game, id: game.key }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={section ? `Jogos: ${section.titulo}` : 'Jogos da seção'}
      description={`Selecione até ${HOME_SECTION_GAMES_MAX} jogos. Arraste os selecionados para definir a ordem de exibição na home.`}
      icon={Gamepad2}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={saveGames} loading={saving} disabled={loading}>
            Salvar jogos
          </Button>
        </>
      }
    >
      {loading ? (
        <LoadingState inline message="Carregando seção..." />
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-white text-sm font-semibold">
                Selecionados ({selectedGames.length}/{HOME_SECTION_GAMES_MAX})
              </h4>
            </div>

            {selectedGames.length === 0 ? (
              <p className="text-gray-500 text-sm rounded-lg border border-dashed border-admin-border px-4 py-6 text-center">
                Nenhum jogo selecionado. Escolha jogos na lista abaixo.
              </p>
            ) : (
              <SortableOrderList
                items={sortableSelected}
                onReorder={(items) => setSelectedGames(items)}
                disabled={saving}
                className="space-y-2 max-h-52 overflow-y-auto pr-1"
                renderItem={(game) => (
                  <div className="flex items-center gap-3 rounded-lg border border-admin-border bg-admin-panel-2/60 px-3 py-2">
                    <GripVertical className="w-4 h-4 text-gray-500 shrink-0" />
                    <img
                      src={game.game_image_url}
                      alt={game.game_name}
                      className="w-10 h-10 rounded object-cover bg-black/30 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{game.game_name}</p>
                      <p className="text-gray-500 text-xs truncate">{game.provider_name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGame(game.key)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      aria-label={`Remover ${game.game_name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
            <div>
              <label className="text-gray-300 text-sm mb-1 block">Provedora</label>
              <select
                value={selectedProviderId === 'all' ? 'all' : String(selectedProviderId)}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedProviderId(value === 'all' ? 'all' : Number(value));
                }}
                className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
              >
                <option value="all">Todas as provedoras</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-300 text-sm mb-1 block">Buscar jogo</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nome do jogo..."
                  className="w-full pl-9 pr-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
                />
              </div>
            </div>
          </div>

          {catalogLoading ? (
            <LoadingState inline message="Carregando catálogo..." />
          ) : (
            <div className="max-h-[340px] overflow-y-auto rounded-xl border border-admin-border bg-admin-panel-2/30 p-3">
              {filteredCatalog.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Nenhum jogo encontrado.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredCatalog.map((game) => {
                    const isSelected = selectedKeys.has(game.key);
                    const isDisabled = !isSelected && selectedGames.length >= HOME_SECTION_GAMES_MAX;

                    return (
                      <button
                        key={game.key}
                        type="button"
                        onClick={() => toggleGame(game)}
                        disabled={isDisabled}
                        className={`rounded-lg border p-2 text-left transition-colors ${
                          isSelected
                            ? 'border-admin-accent bg-admin-accent/10'
                            : isDisabled
                              ? 'border-admin-border opacity-50 cursor-not-allowed'
                              : 'border-admin-border hover:border-admin-accent/40 hover:bg-admin-panel-2/80'
                        }`}
                      >
                        <img
                          src={game.game_image_url}
                          alt={game.game_name}
                          className="w-full aspect-[4/3] rounded object-cover bg-black/30 mb-2"
                        />
                        <p className="text-white text-xs font-medium line-clamp-2">{game.game_name}</p>
                        <p className="text-gray-500 text-[11px] truncate mt-0.5">{game.provider_name}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
