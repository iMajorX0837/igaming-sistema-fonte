import { useNavigate } from 'react-router-dom';
import GamePage from './GamePage';

export default function EsportsPage() {
  const navigate = useNavigate();

  return (
    <GamePage
      embedded
      fullscreen
      gameName="Esportes"
      gameProvider="Esportes"
      gameImage="/assets/logo.svg"
      gameCode="sport"
      launchProvider="Original"
      gameOriginal
      onBack={() => navigate('/')}
    />
  );
}
