import { GAME_CATEGORIES } from '../../lib/platformCatalog';

interface CategorySectionProps {
  slug: string;
  nome: string;
  count: number;
  children: React.ReactNode;
}

export function CategorySection({ slug, nome, count, children }: CategorySectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-white font-semibold">{nome}</h3>
        <span className="text-gray-500 text-xs">{count} itens</span>
      </div>
      <div data-category={slug}>{children}</div>
    </section>
  );
}

export function getCategorySections<T extends { category: string }>(
  items: T[],
  filterCategory: string
): Array<{ slug: string; nome: string; items: T[] }> {
  if (filterCategory !== 'all') {
    const category = GAME_CATEGORIES.find((c) => c.slug === filterCategory);
    return [{ slug: filterCategory, nome: category?.nome ?? filterCategory, items }];
  }

  return GAME_CATEGORIES.map((category) => ({
    slug: category.slug,
    nome: category.nome,
    items: items.filter((item) => item.category === category.slug),
  })).filter((section) => section.items.length > 0);
}
