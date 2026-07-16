import { X } from 'lucide-react';
import IconifyIcon from './IconifyIcon';
import LoadingScreen from './LoadingScreen';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GameInfo } from '../App';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { fetchProvidersCached, fetchGamesForProviderCached, isPlayFiverSlotsProvider } from '../api/playfiversCache';
import { HOME_PAGE_WIDTH_PX } from '../constants/homeLayout';

interface SearchBarProps {
  onGameSelect: (game: GameInfo) => void;
  onSearchStateChange?: (isOpen: boolean) => void;
}

interface SearchGame {
  name: string;
  provider: string;
  image: string;
  category: string;
  game_code: string;
  rounds_free?: boolean;
  original?: boolean;
}

const getCategoryFromProvider = (providerName: string, gameName?: string): string => {
  const providerLower = providerName.toLowerCase();
  const gameNameLower = gameName?.toLowerCase() || '';

  if (
    providerLower.includes('spribe') ||
    gameNameLower.includes('aviator') ||
    gameNameLower.includes('mines') ||
    gameNameLower.includes('space man') ||
    gameNameLower.includes('crash')
  ) {
    return 'crash';
  }

  if (
    providerLower.includes('evolution') ||
    providerLower.includes('pragmatic live') ||
    providerLower.includes('ezugi')
  ) {
    return 'live';
  }

  if (
    gameNameLower.includes('blackjack') ||
    gameNameLower.includes('roulette') ||
    gameNameLower.includes('baccarat') ||
    gameNameLower.includes('poker')
  ) {
    return 'table';
  }

  return 'slots';
};

const matchesCategory = (game: SearchGame, category: string): boolean => {
  switch (category) {
    case 'Todos':
      return true;
    case 'Slots':
      return game.category === 'slots';
    case 'Jogos com bônus':
      return game.rounds_free === true;
    case 'Novos jogos':
      return game.original === true;
    case 'Jogos de torneio':
      return game.category === 'crash';
    case 'Mais jogados da semana':
      return game.category === 'slots';
    case 'Cassino ao vivo':
      return game.category === 'live';
    default:
      return true;
  }
};

const GAME_PLACEHOLDER =
  'https://via.placeholder.com/300x400/1e293b/64748b?text=Game';

const SEARCH_OPEN_WIDTH_PX = HOME_PAGE_WIDTH_PX;
const SEARCH_OPEN_HEIGHT_PX = 42;
const SEARCH_PANEL_BORDER = '1px solid rgba(255, 255, 255, 0.12)';
const SEARCH_CARD_GAP_PX = 12;

export default function SearchBar({ onGameSelect, onSearchStateChange }: SearchBarProps) {
  const { config: homeConfig } = useHomeConfig();
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [allGames, setAllGames] = useState<SearchGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [overlayInsets, setOverlayInsets] = useState({ top: 0, bottom: 0, left: 0 });
  const [panelAnchor, setPanelAnchor] = useState({ top: 0, left: 0, width: 0 });
  const searchRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputPanelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gamesFetchedRef = useRef(false);

  const updateOverlayInsets = useCallback(() => {
    const header = document.querySelector('[data-shell-header]');
    const footer = document.querySelector('[data-shell-footer]');
    const mobileNav = document.querySelector('[data-mobile-nav]');
    const sidebar = document.querySelector('[data-shell-sidebar]');

    const top = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0;

    let bottom = 0;
    if (footer instanceof HTMLElement) {
      const rect = footer.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        bottom = Math.max(bottom, window.innerHeight - rect.top);
      }
    }
    if (mobileNav instanceof HTMLElement) {
      const rect = mobileNav.getBoundingClientRect();
      bottom = Math.max(bottom, window.innerHeight - rect.top);
    }

    let left = 0;
    if (sidebar instanceof HTMLElement) {
      const rect = sidebar.getBoundingClientRect();
      if (rect.right > 0 && rect.left < window.innerWidth) {
        left = Math.max(0, rect.right);
      }
    }

    setOverlayInsets({ top, bottom, left });

    const anchor = searchRef.current?.getBoundingClientRect();
    if (anchor) {
      setPanelAnchor({
        top: anchor.top,
        left: anchor.left,
        width: anchor.width,
      });
    }
  }, []);

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'slots', label: 'Slots' },
    { id: 'bonus', label: 'Jogos com bônus' },
    { id: 'novos', label: 'Novos jogos' },
    { id: 'torneio', label: 'Jogos de torneio' },
    { id: 'mais-jogados', label: 'Mais jogados da semana' },
    { id: 'ao-vivo', label: 'Cassino ao vivo' },
  ];

  const fetchAllGames = useCallback(async () => {
    setIsLoading(true);
    try {
      const providersData = await fetchProvidersCached();

      if (providersData.status !== 1 || !providersData.data) {
        setAllGames([]);
        return;
      }

      const filteredProviders = providersData.data.filter(isPlayFiverSlotsProvider);

      const gamesPromises = filteredProviders.map(async (prov) => {
        try {
          const apiData = await fetchGamesForProviderCached(prov.id);

          if (apiData.status === 1 && apiData.data) {
            return apiData.data
              .filter((game) => game.status === true)
              .map((game) => ({
                name: game.name,
                provider: game.provider.name,
                image: game.image_url,
                category: getCategoryFromProvider(game.provider.name, game.name),
                game_code: game.game_code,
                rounds_free: game.rounds_free,
                original: game.original,
              }));
          }
          return [];
        } catch (err) {
          console.error(`Erro ao buscar jogos do provider ${prov.name}:`, err);
          return [];
        }
      });

      const results = await Promise.all(gamesPromises);
      const seen = new Set<string>();
      const uniqueGames = results.flat().filter((game) => {
        if (seen.has(game.game_code)) return false;
        seen.add(game.game_code);
        return true;
      });
      setAllGames(uniqueGames);
    } catch (err) {
      console.error('Erro ao buscar jogos para pesquisa:', err);
      setAllGames([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredGames = allGames.filter((game) => {
    const query = searchValue.toLowerCase().trim();
    if (!query) return false;

    const matchesSearch =
      game.name.toLowerCase().includes(query) ||
      game.provider.toLowerCase().includes(query);

    return matchesSearch && matchesCategory(game, selectedCategory);
  });

  const displayLimit = 100;
  const displayGames = filteredGames.slice(0, displayLimit);
  const hasSearchQuery = searchValue.trim().length > 0;

  useEffect(() => {
    if (hasSearchQuery && !gamesFetchedRef.current) {
      gamesFetchedRef.current = true;
      void fetchAllGames();
    }
  }, [hasSearchQuery, fetchAllGames]);

  useEffect(() => {
    if (!isOpen) return;

    updateOverlayInsets();

    const scrollParents = new Set<HTMLElement>();
    let node: HTMLElement | null = searchRef.current;

    while (node) {
      const style = window.getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY)) {
        scrollParents.add(node);
      }
      node = node.parentElement;
    }

    const onScrollOrResize = () => updateOverlayInsets();

    scrollParents.forEach((parent) => {
      parent.addEventListener('scroll', onScrollOrResize, { passive: true });
    });
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, { passive: true });

    const sidebar = document.querySelector('[data-shell-sidebar]');
    sidebar?.addEventListener('transitionend', onScrollOrResize);

    const resizeObserver =
      sidebar instanceof HTMLElement ? new ResizeObserver(onScrollOrResize) : null;
    if (sidebar instanceof HTMLElement) {
      resizeObserver?.observe(sidebar);
    }

    return () => {
      scrollParents.forEach((parent) => {
        parent.removeEventListener('scroll', onScrollOrResize);
      });
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize);
      sidebar?.removeEventListener('transitionend', onScrollOrResize);
      resizeObserver?.disconnect();
    };
  }, [isOpen, updateOverlayInsets]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        searchRef.current?.contains(target) ||
        panelRef.current?.contains(target) ||
        inputPanelRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    onSearchStateChange?.(isOpen);
  }, [isOpen, onSearchStateChange]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  const handleInputFocus = () => {
    const rect = searchRef.current?.getBoundingClientRect();
    if (rect) {
      setPanelAnchor({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
    }
    setIsOpen(true);
  };

  const handleGameClick = (game: SearchGame) => {
    onGameSelect({
      name: game.name,
      provider: game.provider,
      image: game.image,
      game_code: game.game_code,
    });
    setSearchValue('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchValue('');
    setIsOpen(false);
  };

  const openPanelWidth = Math.min(
    SEARCH_OPEN_WIDTH_PX,
    Math.max(280, window.innerWidth - overlayInsets.left - 16)
  );
  const openPanelLeft =
    overlayInsets.left + Math.max(0, (window.innerWidth - overlayInsets.left - openPanelWidth) / 2);
  const gamesPanelTop = Math.max(
    panelAnchor.top + SEARCH_OPEN_HEIGHT_PX + SEARCH_CARD_GAP_PX,
    overlayInsets.top
  );

  const inputRow = (
    <div
      className="relative flex items-center w-full"
      style={isOpen ? { height: SEARCH_OPEN_HEIGHT_PX } : undefined}
    >
      <IconifyIcon
        icon="mdi:magnify"
        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10"
        style={{ fontSize: '20px', color: '#FFFFFF' }}
      />

      <input
        ref={inputRef}
        type="text"
        placeholder="Pesquise um jogo de cassino..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onFocus={(e) => {
          handleInputFocus();
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'rgba(123, 63, 242, 0.45)';
          }
        }}
        onBlur={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }
        }}
        className={`w-full pl-12 pr-12 text-slate-300 placeholder-slate-500 focus:outline-none transition-all duration-200 ${
          isOpen ? 'h-[42px] rounded-none' : 'py-2 rounded'
        }`}
        style={{
          backgroundColor: homeConfig.fundo,
          border: isOpen ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
          ...(isOpen ? { height: SEARCH_OPEN_HEIGHT_PX } : {}),
        }}
      />

      {(searchValue || isOpen) && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-4 w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors z-10"
          aria-label="Fechar pesquisa"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  const categoriesRow = (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => setSelectedCategory(category.label)}
          className="px-4 h-8 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0"
          style={{
            backgroundColor: '#7B3FF2',
            color: '#ffffff',
            opacity: selectedCategory === category.label ? 1 : 0.5,
          }}
        >
          {category.label}
        </button>
      ))}
    </div>
  );

  const gamesGrid = (
    <div>
      {isLoading ? (
        <LoadingScreen title="Carregando jogos..." variant="inline" />
      ) : displayGames.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 139px)',
            gap: '12px',
            justifyContent: 'start',
          }}
        >
          {displayGames.map((game) => (
            <button
              key={game.game_code}
              onClick={() => handleGameClick(game)}
              className="group relative overflow-hidden rounded-lg transition-all duration-200 hover:brightness-110"
              style={{
                backgroundColor: homeConfig.fundo,
                width: 139,
                height: 184,
                flexShrink: 0,
                border: SEARCH_PANEL_BORDER,
              }}
            >
              <div className="relative w-full h-full">
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = GAME_PLACEHOLDER;
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <span
                    className="font-bold text-[10px] px-2 py-1 rounded border flex items-center gap-1"
                    style={{ backgroundColor: '#7B3FF2', borderColor: '#9B5FF2', color: '#000000' }}
                  >
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    JOGAR
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-slate-400 text-sm">Nenhum jogo encontrado</p>
        </div>
      )}

      {!isLoading && displayGames.length > 0 && (
        <div
          className="mt-4 pt-4 text-center"
          style={{ borderTop: SEARCH_PANEL_BORDER }}
        >
          <p className="text-slate-400 text-xs">
            Mostrando {displayGames.length}
            {filteredGames.length > displayGames.length
              ? ` de ${filteredGames.length}`
              : ''}{' '}
            {filteredGames.length === 1 ? 'jogo' : 'jogos'}
          </p>
        </div>
      )}
    </div>
  );

  const searchCardStyle = {
    backgroundColor: homeConfig.fundo,
    border: SEARCH_PANEL_BORDER,
  };

  const searchOverlay =
    isOpen &&
    createPortal(
      <>
        <div
          className="fixed bg-black/60 backdrop-blur-sm z-[50] pointer-events-none"
          style={{
            top: overlayInsets.top,
            bottom: overlayInsets.bottom,
            left: overlayInsets.left,
            right: 0,
          }}
          aria-hidden
        />
        <div
          ref={inputPanelRef}
          className="fixed z-[55] shrink-0 overflow-hidden rounded-lg shadow-2xl"
          style={{
            top: panelAnchor.top,
            left: openPanelLeft,
            width: openPanelWidth,
            ...searchCardStyle,
          }}
        >
          {inputRow}
        </div>

        {hasSearchQuery ? (
          <div
            ref={panelRef}
            className="fixed z-[55] flex min-h-0 flex-col overflow-hidden rounded-lg shadow-2xl"
            style={{
              top: gamesPanelTop,
              left: openPanelLeft,
              width: openPanelWidth,
              maxHeight: `calc(100vh - ${gamesPanelTop}px - ${overlayInsets.bottom}px - 16px)`,
              ...searchCardStyle,
            }}
          >
            <div className="shrink-0 px-6 py-4">
              {categoriesRow}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-violet-600 scrollbar-track-slate-800">
              {gamesGrid}
            </div>
          </div>
        ) : null}
      </>,
      document.body
    );

  return (
    <div className="relative w-full" ref={searchRef}>
      {isOpen ? <div aria-hidden style={{ height: SEARCH_OPEN_HEIGHT_PX }} /> : inputRow}
      {searchOverlay}
    </div>
  );
}
