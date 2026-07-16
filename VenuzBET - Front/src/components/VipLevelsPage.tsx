import { Link } from 'react-router-dom';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import { useCallback, useEffect, useRef } from 'react';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { useAuth } from '../contexts/AuthContext';
import { useVipProfile } from '../hooks/useVipProfile';
import { formatBRL } from '../lib/vip';

const THRONE_IMAGE = 'https://royalbetsolutions.com/_ipx/_/assets/imgs/throne.webp';

const SCROLL_STEP = 220;

export default function VipLevelsPage() {
  const { isAuthenticated } = useAuth();
  const { profile, niveis } = useVipProfile();
  const { config: homeConfig } = useHomeConfig();
  const boxesRef = useRef<HTMLDivElement>(null);

  const scrollBoxes = useCallback((direction: 'left' | 'right') => {
    const el = boxesRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === 'left' ? -SCROLL_STEP : SCROLL_STEP,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if ((window as Window & { Iconify?: { scan: () => void } }).Iconify) {
        (window as Window & { Iconify?: { scan: () => void } }).Iconify?.scan();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [profile, niveis]);

  const displayLevels = niveis.length > 0
    ? niveis.map((n) => ({
        nivel: n.nivel,
        name: n.nome,
        image: n.imagem_url || `https://cdn.royalbetsolutions.com/default/vip/${n.grupo}.webp`,
        imageAlt: n.grupo,
        color: n.cor || 'rgb(255, 146, 17)',
        depositoMinimo: n.deposito_minimo,
        cashbackPct: n.cashback_pct,
      }))
    : [];

  return (
    <AppPageScaffold>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-10 md:space-y-14">
            <div className="top-vip flex flex-col-reverse lg:flex-row items-center gap-8 lg:gap-12">
              <div className="title flex-1 min-w-0 text-center lg:text-left">
                <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-4">
                  Assuma o trono que é seu por direito
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 max-w-xl mx-auto lg:mx-0">
                  Desperte seu potencial em um universo reservado para poucos, onde cada detalhe foi pensado
                  para oferecer exclusividade, conforto e prestígio. Tenha acesso a benefícios únicos,
                  atendimento personalizado e recompensas generosas, tudo isso sem compromissos, sem burocracia
                  e com a liberdade que só os grandes merecem.
                </p>
                <Link
                  to="/games"
                  className="play-game btn-shadow inline-flex items-center justify-center h-11 px-8 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm tracking-wide transition-all duration-200 active:scale-[0.98] no-underline"
                  style={{
                    boxShadow:
                      '0px 4px 18.4px 0px rgba(23, 103, 238, 0.45), 0px 0px 10px 0px rgba(0, 69, 209, 0.40), 0px 1px 0px 0px rgba(255, 255, 255, 0.20) inset, 0px -3px 0px 0px rgba(0, 0, 0, 0.15) inset, 0px 0px 12px 0px #0035A1 inset',
                  }}
                >
                  JOGAR AGORA
                </Link>
              </div>

              <div className="img-banner flex shrink-0 items-center justify-center w-full lg:w-auto lg:max-w-[50%]">
                <img
                  src={THRONE_IMAGE}
                  alt="VIP Levels"
                  draggable={false}
                  className="w-full max-w-md lg:max-w-lg h-auto object-contain select-none"
                />
              </div>
            </div>

            {isAuthenticated && (
              <div
                className="rounded-xl border border-white/10 p-5 md:p-6"
                style={{ backgroundColor: '#181923' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                  <img
                    src={profile.vip_imagem || ''}
                    alt={profile.vip_nome}
                    className="w-16 h-16 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Seu nível atual</p>
                    <h2 className="text-white text-xl font-bold" style={{ color: profile.vip_cor || undefined }}>
                      {profile.vip_nome}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Total depositado: <span className="text-white font-semibold">{formatBRL(profile.total_depositado)}</span>
                      {profile.cashback_pct > 0 && (
                        <span className="ml-2">· Cashback: <span className="text-violet-400">{profile.cashback_pct}%</span></span>
                      )}
                    </p>
                  </div>
                </div>

                {profile.proximo_nome ? (
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>Progresso para {profile.proximo_nome}</span>
                      <span>Faltam {formatBRL(profile.falta_para_proximo)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-700/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, profile.progresso_pct)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-violet-400 text-sm font-semibold">Você atingiu o nível máximo — Diamante 3!</p>
                )}
              </div>
            )}

            <div className="list-levels level">
              <div className="title-level flex items-center justify-between gap-4 mb-5">
                <div className="title flex items-center gap-3 min-w-0">
                  <span
                    className="iconify i-ri:vip-crown-line shrink-0 text-violet-400"
                    data-icon="ri:vip-crown-line"
                    aria-hidden="true"
                    style={{ fontSize: '36px' }}
                  />
                  <h2 className="text-white text-xl sm:text-2xl font-bold">Classificação VIP</h2>
                </div>

                <div className="box-btn flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => scrollBoxes('left')}
                    className="next-btn flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#181923] text-slate-300 hover:text-white hover:border-white/20 transition-colors"
                    aria-label="Níveis anteriores"
                  >
                    <span
                      className="iconify i-ic:round-arrow-back-ios"
                      data-icon="ic:round-arrow-back-ios"
                      aria-hidden="true"
                      style={{ fontSize: '16px' }}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollBoxes('right')}
                    className="next-btn flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#181923] text-slate-300 hover:text-white hover:border-white/20 transition-colors"
                    aria-label="Próximos níveis"
                  >
                    <span
                      className="iconify i-ic:round-arrow-forward-ios"
                      data-icon="ic:round-arrow-forward-ios"
                      aria-hidden="true"
                      style={{ fontSize: '16px' }}
                    />
                  </button>
                </div>
              </div>

              <div
                ref={boxesRef}
                className="boxes-levels flex gap-3 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {displayLevels.map((level) => {
                  const isCurrent = isAuthenticated && profile.vip_nivel === level.nivel;
                  const isUnlocked = isAuthenticated && profile.vip_nivel >= level.nivel;
                  return (
                    <div
                      key={level.name}
                      className={`box-level shrink-0 w-[140px] sm:w-[156px] rounded-xl border-2 p-3 flex flex-col items-center gap-3 transition-all ${
                        isCurrent ? 'ring-2 ring-violet-500 ring-offset-2 scale-105' : ''
                      } ${!isUnlocked && isAuthenticated ? 'opacity-50' : ''}`}
                      style={{
                        borderColor: level.color,
                        backgroundColor: '#181923',
                        ...(isCurrent ? { ['--tw-ring-offset-color' as string]: homeConfig.fundo } : {}),
                      }}
                    >
                      <div
                        className="icon-vip flex h-20 w-20 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${level.color} 15%, transparent)`,
                        }}
                      >
                        <img
                          src={level.image}
                          alt={level.imageAlt}
                          draggable={false}
                          className="h-14 w-14 object-contain select-none"
                        />
                      </div>
                      <div className="info-vip text-center w-full">
                        <h2 className="text-white font-bold text-sm">{level.name}</h2>
                        <p className="text-slate-400 text-[10px] mt-1">{formatBRL(level.depositoMinimo)}</p>
                        {level.cashbackPct > 0 && (
                          <p className="text-violet-400 text-[10px]">{level.cashbackPct}% cashback</p>
                        )}
                        {isCurrent && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-600 text-white">
                            ATUAL
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <Footer />
    </AppPageScaffold>
  );
}
