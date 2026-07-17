import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, ChevronDown, ChevronRight, Gamepad2, Layers, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PagePanel from '../components/ui/PagePanel';
import StatCard from '../components/ui/StatCard';
import {
  ApiGame,
  ApiProvider,
  fetchGamesForProvider,
  fetchProviders,
  getProviderSlug,
  isPlayFiverSlotsProvider,
  normalizeProviderName,
} from '../lib/playfiversApi';
import { getCategoryFromProvider, loadPlatformDbOverrides } from '../lib/platformCatalog';
import {
  isProprietaryProviderId,
  PROPRIETARY_GAMES,
  PROPRIETARY_PROVIDER,
  PROPRIETARY_PROVIDER_ID,
} from '../lib/proprietaryCatalog';
import ToggleSwitch from '../components/jogos/ToggleSwitch';
import StatusBadge from '../components/jogos/StatusBadge';
import CategoryTabs from '../components/jogos/CategoryTabs';
import { CategorySection, getCategorySections } from '../components/jogos/CategorySection';

interface GameItem {
  game_code: string;
  nome: string;
  image_url: string;
  api_status: boolean;
  ativo: boolean;
}

interface ProviderGroup {
  id: number;
  slug: string;
  nome: string;
  image_url: string;
  api_status: number;
  integracao: string;
  category: string;
  ativo: boolean;
  games: GameItem[];
  loadingGames: boolean;
  expanded: boolean;
}

export default function JogosPage() {
  const { showToast } = useToast();
  const [providers, setProviders] = useState<ProviderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const loadProviders = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);

        const [apiRes, db] = await Promise.all([fetchProviders(), loadPlatformDbOverrides()]);

        if (apiRes.status !== 1 || !apiRes.data) {
          throw new Error(apiRes.msg || 'Resposta inválida da API de provedores.');
        }

        const providerMap = new Map(db.providers.map((p) => [p.api_provider_id, p.ativo]));
        const slotsProviders = apiRes.data.filter(isPlayFiverSlotsProvider);

        const apiProviders: ProviderGroup[] = slotsProviders.map((prov: ApiProvider) => ({
          id: prov.id,
          slug: getProviderSlug(prov.name),
          nome: normalizeProviderName(prov.name),
          image_url: prov.image_url,
          api_status: prov.status,
          integracao: prov.wallet.name,
          category: getCategoryFromProvider(prov.name),
          ativo: providerMap.get(prov.id) ?? true,
          games: [],
          loadingGames: false,
          expanded: false,
        }));

        const proprietaryProvider: ProviderGroup = {
          id: PROPRIETARY_PROVIDER_ID,
          slug: PROPRIETARY_PROVIDER.slug,
          nome: PROPRIETARY_PROVIDER.name,
          image_url: PROPRIETARY_PROVIDER.image_url,
          api_status: 1,
          integracao: PROPRIETARY_PROVIDER.integracao,
          category: PROPRIETARY_PROVIDER.category,
          ativo: providerMap.get(PROPRIETARY_PROVIDER_ID) ?? false,
          games: [],
          loadingGames: false,
          expanded: false,
        };

        setProviders([proprietaryProvider, ...apiProviders]);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Erro ao carregar catálogo.', 'error');
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const loadGamesForProvider = async (providerId: number) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, loadingGames: true } : p))
    );

    try {
      const db = await loadPlatformDbOverrides();

      if (isProprietaryProviderId(providerId)) {
        const gameMap = new Map(
          db.games
            .filter((g) => g.api_provider_id === providerId)
            .map((g) => [g.game_code, g.ativo])
        );

        const games: GameItem[] = PROPRIETARY_GAMES.map((game) => ({
          game_code: game.game_code,
          nome: game.nome,
          image_url: game.image_url,
          api_status: game.api_status,
          ativo: gameMap.get(game.game_code) ?? false,
        }));

        setProviders((prev) =>
          prev.map((p) => (p.id === providerId ? { ...p, games, loadingGames: false } : p))
        );
        return;
      }

      const [gamesRes] = await Promise.all([
        fetchGamesForProvider(providerId),
      ]);

      if (gamesRes.status !== 1 || !gamesRes.data) {
        throw new Error(gamesRes.msg || 'Resposta inválida da API de jogos.');
      }

      const gameMap = new Map(
        db.games.filter((g) => g.api_provider_id === providerId).map((g) => [g.game_code, g.ativo])
      );

      const games: GameItem[] = gamesRes.data
        .map((game: ApiGame) => ({
          game_code: game.game_code,
          nome: game.name,
          image_url: game.image_url,
          api_status: game.status === true,
          ativo: gameMap.get(game.game_code) ?? true,
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      setProviders((prev) =>
        prev.map((p) => (p.id === providerId ? { ...p, games, loadingGames: false } : p))
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao carregar jogos.', 'error');
      setProviders((prev) =>
        prev.map((p) => (p.id === providerId ? { ...p, loadingGames: false } : p))
      );
    }
  };

  const toggleProviderExpanded = async (providerId: number) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    const willExpand = !provider.expanded;
    setProviders((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, expanded: willExpand } : p))
    );

    if (willExpand && provider.games.length === 0) {
      await loadGamesForProvider(providerId);
    }
  };

  const upsertProvider = async (provider: ProviderGroup, ativo: boolean) => {
    const key = `provider-${provider.id}`;
    setSavingKey(key);
    try {
      const { error } = await supabase.from('platform_providers').upsert(
        {
          api_provider_id: provider.id,
          slug: provider.slug,
          nome: provider.nome,
          image_url: provider.image_url,
          api_status: provider.api_status,
          ativo,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'api_provider_id' }
      );

      if (error) {
        showToast('Erro ao salvar status do provedor.', 'error');
        return;
      }

      setProviders((prev) =>
        prev.map((p) => (p.id === provider.id ? { ...p, ativo } : p))
      );
      showToast(`Provedor ${ativo ? 'ativado' : 'desativado'}.`, 'success');
    } finally {
      setSavingKey(null);
    }
  };

  const upsertGame = async (provider: ProviderGroup, game: GameItem, ativo: boolean) => {
    const key = `game-${provider.id}-${game.game_code}`;
    setSavingKey(key);
    try {
      await supabase.from('platform_providers').upsert(
        {
          api_provider_id: provider.id,
          slug: provider.slug,
          nome: provider.nome,
          image_url: provider.image_url,
          api_status: provider.api_status,
          ativo: provider.ativo,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'api_provider_id' }
      );

      const { error } = await supabase.from('platform_games').upsert(
        {
          api_provider_id: provider.id,
          game_code: game.game_code,
          nome: game.nome,
          image_url: game.image_url,
          api_status: game.api_status,
          ativo,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'api_provider_id,game_code' }
      );

      if (error) {
        showToast('Erro ao salvar status do jogo.', 'error');
        return;
      }

      setProviders((prev) =>
        prev.map((p) =>
          p.id === provider.id
            ? {
                ...p,
                games: p.games.map((g) =>
                  g.game_code === game.game_code ? { ...g, ativo } : g
                ),
              }
            : p
        )
      );
    } finally {
      setSavingKey(null);
    }
  };

  const setAllGamesInProvider = async (provider: ProviderGroup, ativo: boolean) => {
    if (provider.games.length === 0) {
      showToast('Expanda o provedor para carregar os jogos primeiro.', 'error');
      return;
    }

    setSavingKey(`bulk-${provider.id}`);
    try {
      await supabase.from('platform_providers').upsert(
        {
          api_provider_id: provider.id,
          slug: provider.slug,
          nome: provider.nome,
          image_url: provider.image_url,
          api_status: provider.api_status,
          ativo: provider.ativo,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'api_provider_id' }
      );

      const rows = provider.games.map((game) => ({
        api_provider_id: provider.id,
        game_code: game.game_code,
        nome: game.nome,
        image_url: game.image_url,
        api_status: game.api_status,
        ativo,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('platform_games').upsert(rows, {
        onConflict: 'api_provider_id,game_code',
      });

      if (error) {
        showToast('Erro ao atualizar jogos em lote.', 'error');
        return;
      }

      setProviders((prev) =>
        prev.map((p) =>
          p.id === provider.id
            ? { ...p, games: p.games.map((g) => ({ ...g, ativo })) }
            : p
        )
      );
      showToast(`Todos os jogos ${ativo ? 'ativados' : 'desativados'}.`, 'success');
    } finally {
      setSavingKey(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const expandedIds = providers.filter((p) => p.expanded).map((p) => p.id);
    await loadProviders(false);
    for (const id of expandedIds) {
      await loadGamesForProvider(id);
    }
    setRefreshing(false);
    showToast('Catálogo atualizado da API.', 'success');
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const provider of providers) {
      counts[provider.category] = (counts[provider.category] ?? 0) + 1;
    }
    return counts;
  }, [providers]);

  const filteredProviders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return providers
      .map((provider) => {
        const providerMatches =
          !term ||
          provider.nome.toLowerCase().includes(term) ||
          provider.slug.toLowerCase().includes(term);

        const filteredGames = provider.games.filter((game) => {
          const matchesSearch =
            !term ||
            game.nome.toLowerCase().includes(term) ||
            game.game_code.toLowerCase().includes(term);

          const isEffectiveActive = provider.ativo && game.ativo && game.api_status;
          const matchesStatus =
            filterStatus === 'all' ||
            (filterStatus === 'active' && isEffectiveActive) ||
            (filterStatus === 'inactive' && !isEffectiveActive);

          return matchesSearch && matchesStatus;
        });

        const activeGamesCount = provider.games.filter(
          (g) => provider.ativo && g.ativo && g.api_status
        ).length;

        const matchesCategory =
          filterCategory === 'all' || provider.category === filterCategory;

        const showProvider =
          matchesCategory &&
          (providerMatches ||
            filteredGames.length > 0 ||
            (term === '' && filterStatus === 'all'));

        if (!showProvider) return null;

        return {
          ...provider,
          filteredGames: term || filterStatus !== 'all' ? filteredGames : provider.games,
          activeGamesCount,
        };
      })
      .filter(Boolean) as Array<
      ProviderGroup & { filteredGames: GameItem[]; activeGamesCount: number }
    >;
  }, [providers, search, filterStatus, filterCategory]);

  const categorySections = useMemo(
    () => getCategorySections(filteredProviders, filterCategory),
    [filteredProviders, filterCategory]
  );

  const stats = useMemo(() => {
    let totalGames = 0;
    let activeGames = 0;
    let inactiveProviders = 0;

    for (const p of providers) {
      if (!p.ativo) inactiveProviders += 1;
      for (const g of p.games) {
        totalGames += 1;
        if (p.ativo && g.ativo && g.api_status) activeGames += 1;
      }
    }

    return {
      providers: providers.length,
      inactiveProviders,
      totalGames,
      activeGames,
    };
  }, [providers]);

  if (loading) {
    return <LoadingState message="Carregando catálogo..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Gamepad2}
        title="Catálogo de Jogos"
        description="Gerencie provedores e jogos da plataforma, organizados por categoria."
        actions={
          <button
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        }
      />

      <PagePanel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard title="Provedores" value={String(stats.providers)} icon={Layers} color="text-admin-accent" small />
          <StatCard title="Provedores inativos" value={String(stats.inactiveProviders)} icon={Ban} color="text-admin-danger" small />
          <StatCard title="Jogos carregados" value={String(stats.totalGames)} icon={Gamepad2} color="text-admin-info" small />
          <StatCard title="Jogos ativos" value={String(stats.activeGames)} icon={CheckCircle2} color="text-admin-success" small />
        </div>

        <div className="mb-4">
          <CategoryTabs
            value={filterCategory}
            onChange={setFilterCategory}
            counts={categoryCounts}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por provedor ou jogo..."
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-admin-panel border border-admin-border-strong text-white text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-3 py-2 rounded-lg bg-admin-panel border border-admin-border-strong text-white text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="active">Somente ativos</option>
            <option value="inactive">Somente inativos</option>
          </select>
        </div>
      </PagePanel>

      {filteredProviders.length === 0 ? (
        <PagePanel>
          <EmptyState icon={Gamepad2} title="Nenhum provedor encontrado." />
        </PagePanel>
      ) : filterCategory === 'all' ? (
        <div className="space-y-6">
          {categorySections.map((section) => (
            <PagePanel key={section.slug} padding={false} className="overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <CategorySection slug={section.slug} nome={section.nome} count={section.items.length}>
                  <div className="space-y-3">
                    {section.items.map((provider) => (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        savingKey={savingKey}
                        onToggleExpanded={() => void toggleProviderExpanded(provider.id)}
                        onToggleProvider={(ativo) => void upsertProvider(provider, ativo)}
                        onToggleGame={(game, ativo) => void upsertGame(provider, game, ativo)}
                        onBulkGames={(ativo) => void setAllGamesInProvider(provider, ativo)}
                      />
                    ))}
                  </div>
                </CategorySection>
              </div>
            </PagePanel>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              savingKey={savingKey}
              onToggleExpanded={() => void toggleProviderExpanded(provider.id)}
              onToggleProvider={(ativo) => void upsertProvider(provider, ativo)}
              onToggleGame={(game, ativo) => void upsertGame(provider, game, ativo)}
              onBulkGames={(ativo) => void setAllGamesInProvider(provider, ativo)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  savingKey,
  onToggleExpanded,
  onToggleProvider,
  onToggleGame,
  onBulkGames,
}: {
  provider: ProviderGroup & { filteredGames: GameItem[]; activeGamesCount: number };
  savingKey: string | null;
  onToggleExpanded: () => void;
  onToggleProvider: (ativo: boolean) => void;
  onToggleGame: (game: GameItem, ativo: boolean) => void;
  onBulkGames: (ativo: boolean) => void;
}) {
  const gamesToShow = provider.expanded ? provider.filteredGames : [];
  const isSavingProvider = savingKey === `provider-${provider.id}`;
  const isSavingBulk = savingKey === `bulk-${provider.id}`;

  return (
    <div className="rounded-xl border border-admin-border overflow-hidden bg-admin-panel">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          {provider.expanded ? (
            <ChevronDown className="w-5 h-5 text-admin-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-5 h-5 text-admin-foreground shrink-0" />
          )}
          {provider.image_url ? (
            <img
              src={provider.image_url}
              alt={provider.nome}
              className="w-10 h-10 rounded-lg object-cover bg-admin-panel shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-admin-panel shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-white font-semibold">{provider.nome}</h3>
              {provider.id === PROPRIETARY_PROVIDER_ID && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-admin-panel-3 text-admin-accent">
                  VenuzBET
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  provider.ativo
                    ? 'bg-green-900/50 text-admin-success'
                    : 'bg-red-900/50 text-admin-danger'
                }`}
              >
                {provider.ativo ? 'Ativo' : 'Inativo'}
              </span>
              {provider.games.length > 0 && (
                <span className="text-gray-500 text-xs">
                  {provider.activeGamesCount}/{provider.games.length} jogos ativos
                </span>
              )}
            </div>
            <p className="text-gray-400 text-xs mt-0.5">
              Slug: {provider.slug} · ID: {provider.id} · {provider.integracao}
            </p>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          {provider.expanded && provider.games.length > 0 && (
            <>
              <button
                type="button"
                disabled={!!savingKey}
                onClick={() => onBulkGames(true)}
                className="px-3 py-1.5 rounded text-xs font-medium bg-gray-600 hover:bg-gray-500 text-white disabled:opacity-50"
              >
                Ativar todos
              </button>
              <button
                type="button"
                disabled={!!savingKey}
                onClick={() => onBulkGames(false)}
                className="px-3 py-1.5 rounded text-xs font-medium bg-gray-600 hover:bg-gray-500 text-white disabled:opacity-50"
              >
                Desativar todos
              </button>
            </>
          )}
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-sm">Provedor</span>
            <ToggleSwitch
              checked={provider.ativo}
              disabled={isSavingProvider || isSavingBulk}
              onChange={() => onToggleProvider(!provider.ativo)}
              label={`Alternar provedor ${provider.nome}`}
            />
          </div>
        </div>
      </div>

      {provider.expanded && (
        <div className="border-t border-admin-border p-4 bg-admin-panel/50">
          {provider.loadingGames ? (
            <LoadingState inline message="Carregando jogos (fila da API)..." />
          ) : gamesToShow.length === 0 ? (
            <EmptyState icon={Gamepad2} title="Nenhum jogo encontrado para este filtro." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {gamesToShow.map((game) => {
                const effectiveActive = provider.ativo && game.ativo && game.api_status;
                const gameKey = `game-${provider.id}-${game.game_code}`;
                const isSavingGame = savingKey === gameKey;

                return (
                  <div
                    key={game.game_code}
                    className="flex items-center gap-3 p-3 rounded-lg border border-admin-border bg-admin-panel"
                  >
                    <img
                      src={game.image_url}
                      alt={game.nome}
                      className="w-12 h-12 rounded-lg object-cover bg-admin-panel shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate" title={game.nome}>
                        {game.nome}
                      </p>
                      <p className="text-gray-500 text-xs truncate" title={game.game_code}>
                        {game.game_code}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <StatusBadge
                          active={effectiveActive}
                          label={effectiveActive ? 'Visível' : 'Oculto'}
                        />
                        {!game.api_status && (
                          <StatusBadge active={false} label="Inativo na API" />
                        )}
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={game.ativo}
                      disabled={isSavingGame || !!savingKey}
                      onChange={() => onToggleGame(game, !game.ativo)}
                      label={`Alternar jogo ${game.nome}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
