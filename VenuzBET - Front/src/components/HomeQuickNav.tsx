import { Link, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { navigateToGameByName } from '../utils/navigateToGameByName';
import { useHomeQuickNav, type HomeQuickNavItem } from '../hooks/useHomeQuickNav';
import { useHomeConfig } from '../hooks/useHomeConfig';

const RGB_CARD_COUNT = 3;

const innerCardClass =
  'group relative z-10 flex h-full w-full flex-col overflow-hidden rounded-[6px] transition-all duration-200 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60';

const plainCardClass =
  'group flex h-[142px] w-[96px] shrink-0 flex-col overflow-hidden rounded-lg border border-slate-700/50 transition-all duration-200 hover:border-brand/40 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60';

const cardTitleStyle: CSSProperties = {
  fontFamily: 'Montserrat, sans-serif',
  fontStyle: 'normal',
  fontWeight: 800,
  color: 'rgb(255, 255, 255)',
  fontSize: '13px',
  lineHeight: 'normal',
};

function QuickNavCardContent({
  item,
  homeFundo,
}: {
  item: HomeQuickNavItem;
  homeFundo: string;
}) {
  return (
    <>
      <div className="h-[96px] w-full overflow-hidden bg-slate-800">
        <img
          src={item.imagem_url}
          alt={item.titulo}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div
        className="flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-center"
        style={{ backgroundColor: homeFundo }}
      >
        <span
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontStyle: 'normal',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '11px',
            lineHeight: 'normal',
          }}
        >
          Jogue Agora
        </span>
        <span className="line-clamp-2" style={cardTitleStyle}>
          {item.titulo}
        </span>
      </div>
    </>
  );
}

function QuickNavCard({
  item,
  onGameClick,
  homeFundo,
  rgbHighlight = false,
}: {
  item: HomeQuickNavItem;
  onGameClick: (gameName: string) => void;
  homeFundo: string;
  rgbHighlight?: boolean;
}) {
  const content = <QuickNavCardContent item={item} homeFundo={homeFundo} />;

  const className = rgbHighlight
    ? innerCardClass
    : plainCardClass;

  const cardStyle = { backgroundColor: homeFundo };

  const cardElement =
    item.link_tipo === 'game' && item.game_name ? (
      <button type="button" className={className} style={cardStyle} onClick={() => onGameClick(item.game_name!)}>
        {content}
      </button>
    ) : (
      <Link to={item.href ?? '/games'} className={className} style={cardStyle}>
        {content}
      </Link>
    );

  if (!rgbHighlight) {
    return cardElement;
  }

  return <div className="quick-nav-rgb-shell is-active">{cardElement}</div>;
}

export default function HomeQuickNav() {
  const navigate = useNavigate();
  const { items, loading } = useHomeQuickNav();
  const { config: homeConfig } = useHomeConfig();

  const handleGameClick = async (gameName: string) => {
    const ok = await navigateToGameByName(gameName, navigate);
    if (!ok) navigate('/games');
  };

  if (loading && items.length === 0) {
    return null;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto pb-1 pt-0.5 scrollbar-hide animate-page-enter">
      <nav
        className="flex w-max min-w-full justify-start gap-2 px-1.5 sm:gap-2.5"
        aria-label="Atalhos de jogos e categorias"
      >
        {items.map((item, index) => (
          <QuickNavCard
            key={item.id}
            item={item}
            onGameClick={handleGameClick}
            homeFundo={homeConfig.fundo}
            rgbHighlight={index < RGB_CARD_COUNT}
          />
        ))}
      </nav>
    </div>
  );
}
