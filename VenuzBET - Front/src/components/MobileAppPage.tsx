import { FileText, Calendar, Download, Apple, Smartphone } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';

interface MobileAppPageProps {
  onBack: () => void;
}

export default function MobileAppPage({ onBack }: MobileAppPageProps) {

  return (
    <AppPageScaffold>
          <div className="max-w-5xl mx-auto px-6 py-8">
            <BackButton onClick={onBack} className="mb-6" />

            <div className="text-slate-300 leading-relaxed">
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
                    <span>Se não aparecer, clique no menu ⋮ no canto superior direito e procure por "Instalar aplicativo".</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-slate-400 font-medium">3.</span>
                    <span>Confirme clicando em "Instalar".</span>
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

            <div className="min-h-[60vh]" />
          </div>

          <Footer />
    </AppPageScaffold>
  );
}
