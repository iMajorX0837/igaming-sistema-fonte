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
  const hasSrc = Boolean(src?.trim());
  const [loaded, setLoaded] = useState(() => (hasSrc ? isImagePreloaded(src) : true));

  useEffect(() => {
    if (!hasSrc) {
      setLoaded(true);
      return;
    }

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
  }, [src, hasSrc]);

  if (!hasSrc) {
    return (
      <div
        className={containerClassName}
        style={{
          ...containerStyle,
          minHeight: 120,
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 25%, #121319), #121319)',
        }}
        aria-hidden
      />
    );
  }

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
        fetchpriority="high"
        decoding="async"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
