import { useState } from 'react';
import PrizeWheelModal from './PrizeWheelModal';
import { useAuth } from '../contexts/AuthContext';
import { usePrizeWheel } from '../hooks/usePrizeWheel';
import { useTranslation } from '../hooks/useTranslation';

export default function PrizeWheel() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const wheel = usePrizeWheel(isAuthenticated);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (wheel.loading || !wheel.enabled) return null;

  return (
    <>
      <PrizeWheelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        segments={wheel.segments}
        status={wheel.status}
        images={wheel.images}
        refreshStatus={wheel.refreshStatus}
      />
      <button
        type="button"
        className="prize-wheel-widget"
        aria-label={t.navigation.openPrizeWheel}
        onClick={() => setIsModalOpen(true)}
      >
        <img
          src={wheel.images.widget}
          alt={t.prizeWheel.altWidget}
          className="prize-wheel-widget__image"
          draggable={false}
        />
      </button>
    </>
  );
}
