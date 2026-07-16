import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Garante que o Iconify escaneia os ícones após renderizar
    const timer = setTimeout(() => {
      if ((window as any).Iconify) {
        (window as any).Iconify.scan();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AppPageScaffold>
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <h1 className="text-white text-4xl md:text-5xl font-bold mb-4">
                Esta página não foi encontrada
              </h1>
              
              <p className="text-slate-300 text-lg md:text-xl mb-8">
                ESTE LINK PODE ESTAR CORROMPIDO
              </p>

              <button
                onClick={() => navigate('/')}
                className="px-8 py-4 rounded-lg text-white font-bold text-base md:text-lg flex items-center gap-2"
                style={{ 
                  backgroundColor: '#7B3FF2',
                  boxShadow: '0px 4px 18.4px 0px rgba(23, 103, 238, 0.45), 0px 0px 10px 0px rgba(0, 69, 209, 0.40), 0px 1px 0px 0px rgba(255, 255, 255, 0.20) inset, 0px -3px 0px 0px rgba(0, 0, 0, 0.15) inset, 0px 0px 12px 0px #0035A1 inset'
                }}
              >
                <span className="iconify" data-icon="solar:home-bold" aria-hidden="true" style={{ fontSize: '20px' }}></span>
                VOLTAR PARA PAGINA INICIAL
              </button>
            </div>
          </div>
          <Footer />
    </AppPageScaffold>
  );
}

