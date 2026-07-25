import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFooterConfig } from '../hooks/useFooterConfig';
import { openLiveSupportWhatsapp } from '../lib/liveSupport';
import LoadingScreen from './LoadingScreen';
import AppPageScaffold from './AppPageScaffold';

/** `/help/support` não é jogo — abre o WhatsApp do footer e volta pra home. */
export default function LiveSupportRedirect() {
  const navigate = useNavigate();
  const { config } = useFooterConfig();

  useEffect(() => {
    openLiveSupportWhatsapp(config.whatsapp.url);
    navigate('/', { replace: true });
  }, [config.whatsapp.url, navigate]);

  return (
    <AppPageScaffold>
      <LoadingScreen title="Abrindo suporte..." variant="page" />
    </AppPageScaffold>
  );
}
