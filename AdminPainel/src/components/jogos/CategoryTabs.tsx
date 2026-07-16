import { GAME_CATEGORIES } from '../../lib/platformCatalog';

interface CategoryTabsProps {
  value: string;
  onChange: (slug: string) => void;
  counts?: Record<string, number>;
}

export default function CategoryTabs({ value, onChange, counts }: CategoryTabsProps) {
  const tabs = [{ slug: 'all', nome: 'Todas' }, ...GAME_CATEGORIES];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const count = tab.slug === 'all' ? undefined : counts?.[tab.slug];
        const isActive = value === tab.slug;

        return (
          <button
            key={tab.slug}
            type="button"
            onClick={() => onChange(tab.slug)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-admin-accent text-[#0d0e10]'
                : 'bg-admin-panel text-gray-300 border border-admin-border-strong hover:text-white'
            }`}
          >
            {tab.nome}
            {count !== undefined ? ` (${count})` : ''}
          </button>
        );
      })}
    </div>
  );
}
