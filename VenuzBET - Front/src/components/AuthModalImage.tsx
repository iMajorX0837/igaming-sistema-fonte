import { useEffect, useState, type CSSProperties } from 'react';
import { isImagePreloaded, preloadImage } from '../lib/preloadImages';

interface AuthModalImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  containerStyle?: CSSProperties;
}

export default function AuthModalImage({
  src,
  alt,
  className = 'w-full h-auto object-contain',
  containerClassName = 'relative flex w-full justify-center items-center overflow-hidden',
  containerStyle,
}: AuthModalImageProps) {
  const [loaded, setLoaded] = useState(() => isImagePreloaded(src));

  useEffect(() => {
    if (isImagePreloaded(src)) {
      setLoaded(true);
      return;
    }

    setLoaded(false);
    let cancelled = false;

    void preloadImage(src).then(() => {
      if (!cancelled) setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className={containerClassName} style={containerStyle}>
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-800/90 via-slate-700/60 to-slate-800/90"
          aria-hidden
        />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
