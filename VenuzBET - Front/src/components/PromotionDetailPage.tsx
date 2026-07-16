import { useNavigate, useParams } from 'react-router-dom';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';
import LoadingScreen from './LoadingScreen';
import { usePromotionDetail } from '../hooks/usePromotionBanners';
import { useHomeConfig } from '../hooks/useHomeConfig';

export default function PromotionDetailPage() {
  const navigate = useNavigate();
  const { promotionId } = useParams<{ promotionId: string }>();
  const { promotion, loading, error } = usePromotionDetail(promotionId);
  const { config: homeConfig } = useHomeConfig();

  return (
    <AppPageScaffold>
      <div className="flex min-h-full flex-col" style={{ backgroundColor: homeConfig.fundo }}>
        <div className="mx-auto w-full max-w-[1080px] flex-1 px-6 py-8">
          <BackButton onClick={() => navigate('/help/promotions')} className="mb-6" />

          {loading ? (
            <LoadingScreen
              title="Carregando promoção..."
              variant="page"
              className="min-h-[40vh] rounded-xl border border-[#7B3FF2] bg-[#181923]"
            />
          ) : error || !promotion ? (
            <div
              className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-xl border px-6 py-16"
              style={{ borderColor: '#7B3FF2', backgroundColor: '#181923' }}
            >
              <p
                className="text-center text-lg font-semibold text-slate-300"
                style={{ fontFamily: 'Montserrat, sans-serif' }}
              >
                {error || 'Promoção não encontrada'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/help/promotions')}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#7B3FF2' }}
              >
                Ver todas as promoções
              </button>
            </div>
          ) : (
            <article className="overflow-hidden rounded-xl border" style={{ borderColor: '#7B3FF2' }}>
              <div className="overflow-hidden bg-[#121319]">
                {promotion.imagem_url ? (
                  <img
                    src={promotion.imagem_url}
                    alt={promotion.titulo}
                    className="h-auto w-full object-cover"
                  />
                ) : (
                  <div className="flex min-h-[240px] w-full items-center justify-center text-sm text-slate-500">
                    Sem imagem
                  </div>
                )}
              </div>

              <div className="px-6 py-6 md:px-8 md:py-8" style={{ backgroundColor: homeConfig.fundo }}>
                <h1
                  className="text-2xl font-bold leading-tight text-white md:text-3xl"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {promotion.titulo}
                </h1>
                <p
                  className="mt-4 whitespace-pre-line text-base leading-relaxed text-slate-300 md:text-lg"
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {promotion.texto}
                </p>
              </div>
            </article>
          )}
        </div>

        <Footer />
      </div>
    </AppPageScaffold>
  );
}
