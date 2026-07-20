import { Apple, Smartphone } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';
import { appPageContainerClass } from '../constants/homeLayout';

interface MobileAppPageProps {
  onBack: () => void;
}

export default function MobileAppPage({ onBack }: MobileAppPageProps) {
  return (
    <AppPageScaffold>
      <div className={`flex flex-col min-h-full ${appPageContainerClass}`}>
        <div className="flex-1 py-4 sm:py-6 md:py-8 max-md:pb-2">
          <BackButton onClick={onBack} className="hidden md:inline-flex mb-6" />

          <div className="md:hidden space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="h-7 w-7 shrink-0 text-brand-light" strokeWidth={2} />
                <h1 className="text-white text-xl font-bold">Instale o app</h1>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Adicione o site à tela inicial do celular para acessar como app, sem precisar ir à loja de aplicativos.
              </p>
            </div>

            <section className="rounded-xl border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Apple className="h-5 w-5 shrink-0 text-white" strokeWidth={2} />
                <h2 className="text-white text-base font-semibold">iPhone (Safari)</h2>
              </div>
              <ol className="space-y-2 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="text-slate-500 font-medium shrink-0">1.</span>
                  <span>Abra o site no Safari.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-500 font-medium shrink-0">2.</span>
                  <span>Toque em Compartilhar (ícone de exportar na barra inferior).</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-500 font-medium shrink-0">3.</span>
                  <span>Selecione &quot;Adicionar à Tela de Início&quot;.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-500 font-medium shrink-0">4.</span>
                  <span>Confirme em Adicionar.</span>
                </li>
              </ol>
            </section>

            <section className="rounded-xl border border-white/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 shrink-0 text-white" strokeWidth={2} />
                <h2 className="text-white text-base font-semibold">Android (Chrome)</h2>
              </div>
              <ol className="space-y-2 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="text-slate-500 font-medium shrink-0">1.</span>
                  <span>Abra o site no Chrome.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-500 font-medium shrink-0">2.</span>
                  <span>Toque no menu ⋮ no canto superior direito.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-500 font-medium shrink-0">3.</span>
                  <span>Selecione &quot;Instalar aplicativo&quot; ou &quot;Adicionar à tela inicial&quot;.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-500 font-medium shrink-0">4.</span>
                  <span>Confirme a instalação.</span>
                </li>
              </ol>
            </section>
          </div>

          <div className="hidden md:block text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-white text-2xl font-bold mb-4">Como instalar?</h2>
              <p className="text-slate-300 leading-relaxed mb-6">
                Nosso site está disponível como um aplicativo. Você pode instalá-lo no seu computador em poucos segundos, sem precisar ir na loja de aplicativos!
              </p>

              <h3 className="text-white text-lg font-semibold mb-4">Para instalar este app no seu computador usando o navegador Chrome:</h3>
              <ol className="space-y-1 text-slate-300 mb-8">
                <li className="flex gap-3">
                  <span className="text-slate-400 font-medium">1.</span>
                  <span>Clique no ícone de instalação que aparece no canto direito da barra de endereço.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400 font-medium">2.</span>
                  <span>Se não aparecer, clique no menu ⋮ no canto superior direito e procure por &quot;Instalar aplicativo&quot;.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400 font-medium">3.</span>
                  <span>Confirme clicando em &quot;Instalar&quot;.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-slate-400 font-medium">4.</span>
                  <span>O app será adicionado como um programa no seu computador.</span>
                </li>
              </ol>

              <div className="flex justify-center mb-8">
                <img
                  src="/assets/imgs/top-desktop.png"
                  alt="Como instalar"
                  className="max-w-full h-auto rounded-lg shadow-lg"
                  loading="eager"
                  decoding="async"
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
