import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import { useNavigate } from 'react-router-dom';
import { usePromotionBanners } from '../hooks/usePromotionBanners';
import { useHomeConfig } from '../hooks/useHomeConfig';
import LoadingScreen from './LoadingScreen';

interface PromotionsPageProps {
  onBack: () => void;
}

const BANNER_WIDTH = 525;
const BANNER_HEIGHT = 281;

function PromotionBannerCard({
  id,
  titulo,
  texto,
  imagem_url,
  fundo,
}: {
  id: string;
  titulo: string;
  texto: string;
  imagem_url: string | null;
  fundo: string;
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/help/promotions/${id}`)}
      className="flex w-full flex-col overflow-hidden rounded-xl border text-left transition-transform duration-200 hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      style={{
        aspectRatio: `${BANNER_WIDTH} / ${BANNER_HEIGHT}`,
        borderColor: 'var(--brand-primary)',
      }}
    >
      <div className="min-h-0 flex-1 w-full overflow-hidden bg-[#121319]">
        {imagem_url ? (
          <img
            src={imagem_url}
            alt={titulo}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-500 text-sm">
            Sem imagem
          </div>
        )}
      </div>
      <div className="shrink-0 px-4 py-2.5" style={{ backgroundColor: fundo }}>
        <h2
          className="text-sm font-bold leading-tight text-white line-clamp-1"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          {titulo}
        </h2>
        <p
          className="mt-0.5 text-xs leading-snug text-slate-300 line-clamp-2"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          {texto}
        </p>
      </div>
    </button>
  );
}

export default function PromotionsPage({ onBack: _onBack }: PromotionsPageProps) {
  const { banners, loading } = usePromotionBanners();
  const { config: homeConfig } = useHomeConfig();

  return (
    <AppPageScaffold>
      <div className="flex flex-col min-h-full" style={{ backgroundColor: homeConfig.fundo }}>
        <div className="mx-auto w-full max-w-[1080px] px-6 py-8 flex-1">
        {loading ? (
          <LoadingScreen title="Carregando promoções..." variant="page" className="min-h-[40vh] rounded-xl border border-brand bg-[#181923]" />
        ) : banners.length === 0 ? (
          <div
            className="flex min-h-[40vh] items-center justify-center rounded-xl border px-6 py-16"
            style={{ borderColor: 'var(--brand-primary)', backgroundColor: '#181923' }}
          >
            <p
              className="text-center text-lg font-semibold text-slate-300"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              Sem promoções no momento
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {banners.map((banner) => (
              <PromotionBannerCard
                key={banner.id}
                id={banner.id}
                titulo={banner.titulo}
                texto={banner.texto}
                imagem_url={banner.imagem_url}
                fundo={homeConfig.fundo}
              />
            ))}
          </div>
        )}
        </div>
        <Footer />
      </div>
    </AppPageScaffold>
  );
}
