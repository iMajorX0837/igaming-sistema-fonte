import { useState, useEffect, useRef, useCallback } from 'react';
import { useHomeBanners } from '../hooks/useHomeBanners';

const DRAG_THRESHOLD = 48;

export default function Banner() {
  const { banners } = useHomeBanners();
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentBanner((prev) => (prev >= banners.length ? 0 : prev));
  }, [banners.length]);

  useEffect(() => {
    if (isPaused || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, banners.length]);

  const pauseAutoplay = useCallback(() => {
    setIsPaused(true);
    window.setTimeout(() => setIsPaused(false), 3000);
  }, []);

  const goToPrevious = useCallback(() => {
    if (banners.length <= 1) return;
    pauseAutoplay();
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length, pauseAutoplay]);

  const goToNext = useCallback(() => {
    if (banners.length <= 1) return;
    pauseAutoplay();
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  }, [banners.length, pauseAutoplay]);

  const goToBanner = (index: number) => {
    pauseAutoplay();
    setCurrentBanner(index);
  };

  const finishDrag = useCallback(
    (clientX: number) => {
      if (!isDragging) return;

      const delta = clientX - dragStartX.current;
      setIsDragging(false);
      setDragOffset(0);

      if (Math.abs(delta) >= DRAG_THRESHOLD) {
        if (delta > 0) goToPrevious();
        else goToNext();
      } else {
        pauseAutoplay();
      }
    },
    [isDragging, goToNext, goToPrevious, pauseAutoplay]
  );

  const handleMouseDown = (event: React.MouseEvent) => {
    if (banners.length <= 1 || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    setIsDragging(true);
    setIsPaused(true);
    dragStartX.current = event.clientX;
    setDragOffset(0);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging) return;
    setDragOffset(event.clientX - dragStartX.current);
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    finishDrag(event.clientX);
  };

  const handleMouseLeave = (event: React.MouseEvent) => {
    if (isDragging) finishDrag(event.clientX);
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (banners.length <= 1) return;
    setIsDragging(true);
    setIsPaused(true);
    dragStartX.current = event.touches[0].clientX;
    setDragOffset(0);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!isDragging) return;
    setDragOffset(event.touches[0].clientX - dragStartX.current);
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    const touch = event.changedTouches[0];
    if (touch) finishDrag(touch.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseUp = (event: MouseEvent) => {
      finishDrag(event.clientX);
    };

    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, [isDragging, finishDrag]);

  if (banners.length === 0) return null;

  const canDrag = banners.length > 1;

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-[21/9] max-h-[380px] rounded-3xl overflow-hidden group select-none ${
        canDrag ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`flex h-full ${isDragging ? '' : 'transition-transform duration-300 ease-out'}`}
        style={{
          width: `${banners.length * 100}%`,
          transform: `translateX(calc(-${currentBanner * (100 / banners.length)}% + ${dragOffset}px))`,
        }}
      >
        {banners.map((banner) => (
          <div
            key={banner.id}
            className="h-full shrink-0"
            style={{ width: `${100 / banners.length}%` }}
          >
            <img
              src={banner.imagem_url}
              alt={banner.titulo || 'Banner'}
              draggable={false}
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>
        ))}
      </div>

      {canDrag && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 cursor-pointer"
            aria-label="Banner anterior"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 cursor-pointer"
            aria-label="Próximo banner"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => goToBanner(index)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  index === currentBanner
                    ? 'bg-white w-8'
                    : 'bg-white/50 w-2 hover:bg-white/70'
                }`}
                aria-label={`Ir para banner ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
