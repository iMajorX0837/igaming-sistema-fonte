export function reorderById<T extends { id: string }>(items: T[], sourceId: string, targetId: string): T[] {
  if (sourceId === targetId) return items;

  const fromIndex = items.findIndex((item) => item.id === sourceId);
  const toIndex = items.findIndex((item) => item.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return items;

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function applySequentialOrder<T extends { ordem: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, ordem: index + 1 }));
}
