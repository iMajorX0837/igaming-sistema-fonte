import { useState } from 'react';
import PrizeWheelModal from './PrizeWheelModal';
import { useAuth } from '../contexts/AuthContext';
import { usePrizeWheel } from '../hooks/usePrizeWheel';

export default function PrizeWheel() {
  const { isAuthenticated } = useAuth();
  const { enabled, loading, images } = usePrizeWheel(isAuthenticated);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading || !enabled) return null;

  return (
    <>
      <PrizeWheelModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <button
        type="button"
        className="prize-wheel-widget"
        aria-label="Abrir roleta de prêmios"
        onClick={() => setIsModalOpen(true)}
      >
        <img
          src={images.widget}
          alt="Roleta de prêmios"
          className="prize-wheel-widget__image"
          draggable={false}
        />
      </button>
    </>
  );
}
