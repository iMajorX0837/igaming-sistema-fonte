import { useNavigate } from 'react-router-dom';
import GamePage from './GamePage';
import { useHeaderConfig } from '../hooks/useHeaderConfig';
import { useTranslation } from '../hooks/useTranslation';

export default function EsportsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { config } = useHeaderConfig();
  const sportsLabel = t.home.sports;

  return (
    <GamePage
      embedded
      fullscreen
      gameName={sportsLabel}
      gameProvider={sportsLabel}
      gameImage={config.logo_url}
      gameCode="sport"
      launchProvider="Original"
      gameOriginal
      onBack={() => navigate('/')}
    />
  );
}
