import { useNavigate } from 'react-router-dom';
import GamePage from './GamePage';
import { useTranslation } from '../hooks/useTranslation';

export default function EsportsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const sportsLabel = t.home.sports;

  return (
    <GamePage
      embedded
      fullscreen
      gameName={sportsLabel}
      gameProvider={sportsLabel}
      gameImage="/assets/logo.svg"
      gameCode="sport"
      launchProvider="Original"
      gameOriginal
      onBack={() => navigate('/')}
    />
  );
}
