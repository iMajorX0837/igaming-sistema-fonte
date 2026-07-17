import { useHomeConfig } from '../hooks/useHomeConfig';
import IconifyIcon from './IconifyIcon';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: 'page' | 'compact';
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Pesquisar',
  className = '',
  variant = 'page',
}: SearchInputProps) {
  const { config: homeConfig } = useHomeConfig();

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--brand-primary)';
    if (variant === 'page') {
      e.currentTarget.style.boxShadow = '0 0 0 2px rgb(var(--brand-primary-rgb) / 0.2)';
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = variant === 'page' ? 'var(--brand-primary)' : '';
    if (variant === 'page') {
      e.currentTarget.style.boxShadow = 'none';
    }
  };

  if (variant === 'compact') {
    return (
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`w-full h-8 px-3 rounded border border-brand/30 text-slate-300 text-xs placeholder-slate-500 focus:outline-none focus:border-brand ${className}`}
        style={{ backgroundColor: homeConfig.fundo }}
      />
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      <IconifyIcon
        icon="mdi:magnify"
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ fontSize: '20px', color: '#FFFFFF' }}
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="block w-full h-11 pl-11 pr-4 rounded-lg border text-slate-300 placeholder-slate-500 focus:outline-none transition-all"
        style={{ backgroundColor: homeConfig.fundo, borderColor: 'var(--brand-primary)' }}
      />
    </div>
  );
}
