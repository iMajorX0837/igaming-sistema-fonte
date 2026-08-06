import { Link } from 'react-router-dom';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import { useCallback, useEffect, useRef } from 'react';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { useAuth } from '../contexts/AuthContext';
import { useVipProfile } from '../hooks/useVipProfile';
import { formatBRL } from '../lib/vip';
import { useTranslation } from '../hooks/useTranslation';
import { appPageContainerClass } from '../constants/homeLayout';

const SCROLL_STEP = 220;

export default function VipLevelsPage() {
  const { isAuthenticated } = useAuth();
  const { profile, niveis } = useVipProfile();
  const { config: homeConfig } = useHomeConfig();
  const { t } = useTranslation();
  const vipCardBg = `color-mix(in srgb, ${homeConfig.fundo} 88%, black)`;
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
        image: n.imagem_url || '',
        imageAlt: n.grupo,
        color: n.cor || 'rgb(255, 146, 17)',
        depositoMinimo: n.deposito_minimo,
        cashbackPct: n.cashback_pct,
      }))
    : [];

  return (
    <AppPageScaffold>
          <div className={`${appPageContainerClass} py-6 md:py-12 space-y-8 md:space-y-14`}>
            <div className="top-vip flex flex-col-reverse lg:flex-row items-center gap-6 md:gap-8 lg:gap-12">
              <div className="title flex-1 min-w-0 text-center lg:text-left">
                <h1 className="text-white text-xl sm:text-3xl md:text-4xl font-bold leading-tight mb-3 md:mb-4">
                  {t.vip.heroTitle}
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-5 md:mb-6 max-w-xl mx-auto lg:mx-0">
                  {t.vip.heroSubtitle}
                </p>
                <Link
                  to="/games"
                  className="play-game btn-shadow inline-flex items-center justify-center h-11 px-6 md:px-8 rounded-lg bg-brand hover:bg-brand-hover text-white font-bold text-sm tracking-wide transition-all duration-200 active:scale-[0.98] no-underline btn-brand-submit"
                >
                  {t.vip.playNow}
                </Link>
              </div>

              <div
                className="img-banner flex shrink-0 items-center justify-center w-full max-w-xs sm:max-w-md lg:w-auto lg:max-w-[50%] aspect-[4/3] rounded-2xl border border-white/10"
                style={{
                  background:
                    'radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--brand-primary) 45%, transparent), transparent 70%), linear-gradient(180deg, color-mix(in srgb, var(--brand-primary) 18%, #121319), #121319)',
                }}
                aria-hidden="true"
              >
                <span
                  className="iconify i-solar:crown-bold-duotone text-white/90"
                  data-icon="solar:crown-bold-duotone"
                  style={{ fontSize: '96px' }}
                />
              </div>
            </div>

            {isAuthenticated && (
              <div
                className="rounded-xl border border-white/10 p-4 md:p-6"
                style={{ backgroundColor: vipCardBg }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                  {profile.vip_imagem ? (
                    <img
                      src={profile.vip_imagem}
                      alt={profile.vip_nome}
                      className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover shrink-0 mx-auto sm:mx-0"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 md:w-16 md:h-16 rounded-full shrink-0 mx-auto sm:mx-0 flex items-center justify-center border border-white/10"
                      style={{ backgroundColor: profile.vip_cor || 'var(--brand-primary)' }}
                      aria-hidden="true"
                    >
                      <span className="text-white font-bold text-lg">
                        {(profile.vip_nome || 'V').charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{t.vip.currentLevel}</p>
                    <h2 className="text-white text-lg md:text-xl font-bold" style={{ color: profile.vip_cor || undefined }}>
                      {profile.vip_nome}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                      {t.vip.totalDeposited} <span className="text-white font-semibold">{formatBRL(profile.total_depositado)}</span>
                      {profile.cashback_pct > 0 && (
                        <span className="max-md:block md:ml-2">
                          {t.vip.cashback} <span className="text-brand-light">{profile.cashback_pct}%</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {profile.proximo_nome ? (
                  <div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between text-xs text-slate-400 mb-2">
                      <span>{t.vip.progressTo(profile.proximo_nome)}</span>
                      <span>{t.vip.remaining(formatBRL(profile.falta_para_proximo))}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-700/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-500"
                        style={{ width: `${Math.min(100, profile.progresso_pct)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-brand-light text-sm font-semibold text-center sm:text-left">{t.vip.maxLevel}</p>
                )}
              </div>
            )}

            <div className="list-levels level">
              <div className="title-level flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-5">
                <div className="title flex items-center gap-3 min-w-0">
                  <span
                    className="iconify i-ri:vip-crown-line shrink-0 text-brand-light"
                    data-icon="ri:vip-crown-line"
                    aria-hidden="true"
                    style={{ fontSize: '32px' }}
                  />
                  <h2 className="text-white text-lg sm:text-2xl font-bold">{t.vip.classification}</h2>
                </div>

                <div className="box-btn flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => scrollBoxes('left')}
                    className="next-btn flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors"
                    style={{ backgroundColor: vipCardBg }}
                    aria-label={t.vip.previousLevels}
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
                    className="next-btn flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors"
                    style={{ backgroundColor: vipCardBg }}
                    aria-label={t.vip.nextLevels}
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
                className="boxes-levels flex gap-3 overflow-x-auto pb-2 scroll-smooth max-md:snap-x max-md:snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {displayLevels.map((level) => {
                  const isCurrent = isAuthenticated && profile.vip_nivel === level.nivel;
                  const isUnlocked = isAuthenticated && profile.vip_nivel >= level.nivel;
                  return (
                    <div
                      key={level.name}
                      className={`box-level shrink-0 w-[132px] sm:w-[156px] max-md:snap-start rounded-xl border-2 p-3 flex flex-col items-center gap-3 transition-all ${
                        isCurrent ? 'ring-2 ring-brand ring-offset-2 max-md:scale-100 md:scale-105' : ''
                      } ${!isUnlocked && isAuthenticated ? 'opacity-50' : ''}`}
                      style={{
                        borderColor: level.color,
                        backgroundColor: vipCardBg,
                        ...(isCurrent ? { ['--tw-ring-offset-color' as string]: homeConfig.fundo } : {}),
                      }}
                    >
                      <div
                        className="icon-vip flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${level.color} 15%, transparent)`,
                        }}
                      >
                        {level.image ? (
                          <img
                            src={level.image}
                            alt={level.imageAlt}
                            draggable={false}
                            className="h-12 w-12 sm:h-14 sm:w-14 object-contain select-none"
                          />
                        ) : (
                          <span
                            className="font-bold text-lg sm:text-xl"
                            style={{ color: level.color }}
                          >
                            {level.nivel}
                          </span>
                        )}
                      </div>
                      <div className="info-vip text-center w-full">
                        <h2 className="text-white font-bold text-sm">{level.name}</h2>
                        <p className="text-slate-400 text-[10px] mt-1">{formatBRL(level.depositoMinimo)}</p>
                        {level.cashbackPct > 0 && (
                          <p className="text-brand-light text-[10px]">{level.cashbackPct}% {t.vip.cashbackLabel}</p>
                        )}
                        {isCurrent && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-brand text-white">
                            {t.vip.current}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="max-md:min-h-[6vh] md:min-h-[10vh]" aria-hidden="true" />
          </div>

          <Footer containerClassName="w-full" />
    </AppPageScaffold>
  );
}
