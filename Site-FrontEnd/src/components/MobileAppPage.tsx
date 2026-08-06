import { Apple, Smartphone } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';
import { useTranslation } from '../hooks/useTranslation';
import { appPageContainerClass } from '../constants/homeLayout';

interface MobileAppPageProps {
  onBack: () => void;
}

export default function MobileAppPage({ onBack }: MobileAppPageProps) {
  const { t } = useTranslation();
  const copy = t.mobileApp;

  return (
    <AppPageScaffold>
      <div className={`flex flex-col min-h-full ${appPageContainerClass}`}>
        <div className="flex-1 py-4 sm:py-6 md:py-8 max-md:pb-2">
          <BackButton onClick={onBack} className="hidden md:inline-flex mb-6" />

          <div className="md:hidden space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="h-7 w-7 shrink-0 text-brand-light" strokeWidth={2} />
                <h1 className="text-white text-xl font-bold">{copy.installAppTitle}</h1>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{copy.installAppSubtitle}</p>
            </div>

            <section className="rounded-xl border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Apple className="h-5 w-5 shrink-0 text-white" strokeWidth={2} />
                <h2 className="text-white text-base font-semibold">{copy.iphone}</h2>
              </div>
              <ol className="space-y-2 text-sm text-slate-300">
                {copy.iphoneSteps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="text-slate-500 font-medium shrink-0">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-xl border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 shrink-0 text-white" strokeWidth={2} />
                <h2 className="text-white text-base font-semibold">{copy.android}</h2>
              </div>
              <ol className="space-y-2 text-sm text-slate-300">
                {copy.androidSteps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="text-slate-500 font-medium shrink-0">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="hidden md:block text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-white text-2xl font-bold mb-4">{copy.howToInstall}</h2>
              <p className="text-slate-300 leading-relaxed mb-6">{copy.desktopIntro}</p>

              <h3 className="text-white text-lg font-semibold mb-4">{copy.chromeInstallHeading}</h3>
              <ol className="space-y-1 text-slate-300 mb-8">
                {copy.chromeSteps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="text-slate-400 font-medium">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="flex justify-center mb-8">
                <img
                  src="/assets/imgs/top-desktop.png"
                  alt={copy.installImageAlt}
                  className="max-w-full h-auto rounded-lg shadow-lg"
                  loading="eager"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </section>
          </div>

          <div className="max-md:min-h-[6vh] md:min-h-[60vh]" aria-hidden="true" />
        </div>

        <Footer containerClassName="w-full" />
      </div>
    </AppPageScaffold>
  );
}
