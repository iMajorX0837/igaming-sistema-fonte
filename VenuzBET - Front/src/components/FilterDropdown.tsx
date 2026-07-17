import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import SearchInput from './SearchInput';
import { useHomeConfig } from '../hooks/useHomeConfig';

export interface FilterDropdownItem {
  id: string;
  label: string;
}

interface FilterDropdownProps {
  items: FilterDropdownItem[];
  onSelect: (id: string) => void;
  selectedLabel: string;
  icon: LucideIcon;
  className?: string;
}

function ItemIcon() {
  return (
    <svg className="w-4 h-4 text-brand-light flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function FilterDropdown({
  items,
  onSelect,
  selectedLabel,
  icon: Icon,
  className = '',
}: FilterDropdownProps) {
  const { config: homeConfig } = useHomeConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hoverBg = `color-mix(in srgb, ${homeConfig.fundo} 85%, white)`;

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setSearchTerm('');
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} className={`relative w-full md:w-[220px] ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full h-11 pl-10 pr-10 rounded-lg border border-brand/40 text-slate-300 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all flex items-center justify-between gap-2 min-w-0"
        style={{ backgroundColor: homeConfig.fundo }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = hoverBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = homeConfig.fundo;
        }}
      >
        <span className="text-sm truncate flex-1 min-w-0 text-left">{selectedLabel}</span>
        <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-light pointer-events-none" />

      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 border border-brand/40 rounded-lg shadow-xl z-[60] overflow-hidden"
          style={{ backgroundColor: homeConfig.fundo }}
        >
          <div className="p-2 border-b border-slate-700">
            <SearchInput
              variant="compact"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>
          <div
            className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-brand scrollbar-track-slate-800"
            style={{ backgroundColor: homeConfig.fundo }}
          >
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className="w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-slate-700/50 text-slate-300 hover:text-white text-sm transition-colors"
              >
                <ItemIcon />
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
