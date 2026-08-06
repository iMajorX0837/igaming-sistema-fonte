import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { reorderById } from '../lib/reorderUtils';

interface SortableOrderListProps<T extends { id: string }> {
  items: T[];
  onReorder: (items: T[]) => void | Promise<void>;
  renderItem: (item: T, index: number) => ReactNode;
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
}

export default function SortableOrderList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  disabled = false,
  className = 'space-y-3',
  itemClassName = '',
}: SortableOrderListProps<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const itemsRef = useRef(items);
  const onReorderRef = useRef(onReorder);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  useEffect(() => {
    if (!draggingId) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextTargetId = getTargetIdFromPointer(
        event.clientY,
        itemsRef.current,
        itemRefs.current,
        draggingId
      );
      setDragOverId(nextTargetId);
    };

    const handlePointerUp = async () => {
      const sourceId = draggingId;
      const targetId = dragOverId;
      const currentItems = itemsRef.current;

      setDraggingId(null);
      setDragOverId(null);

      if (!sourceId || !targetId || sourceId === targetId || disabled || isSaving) return;

      const reordered = reorderById(currentItems, sourceId, targetId);
      setIsSaving(true);
      try {
        await onReorderRef.current(reordered);
      } finally {
        setIsSaving(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingId, dragOverId, disabled, isSaving]);

  const startDrag = (id: string, event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || isSaving) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    setDragOverId(id);
  };

  return (
    <div className={className}>
      {items.map((item, index) => {
        const isDragging = draggingId === item.id;
        const isDropTarget = dragOverId === item.id && draggingId !== null && draggingId !== item.id;

        return (
          <div
            key={item.id}
            ref={(node) => {
              if (node) itemRefs.current.set(item.id, node);
              else itemRefs.current.delete(item.id);
            }}
            className={`flex items-stretch gap-2 transition-all duration-150 ${
              isDragging ? 'opacity-50 scale-[0.99]' : ''
            } ${isDropTarget ? 'ring-2 ring-admin-accent/30 rounded-lg' : ''} ${itemClassName}`}
          >
            <button
              type="button"
              onPointerDown={(event) => startDrag(item.id, event)}
              disabled={disabled || isSaving}
              className={`flex items-center justify-center w-9 shrink-0 rounded-lg border border-admin-border bg-admin-panel text-admin-muted transition-colors ${
                disabled || isSaving
                  ? 'opacity-40 cursor-not-allowed'
                  : 'cursor-grab active:cursor-grabbing hover:text-admin-foreground hover:border-admin-accent/24'
              }`}
              aria-label="Arrastar para reorganizar"
              title="Segure e arraste para reorganizar"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">{renderItem(item, index)}</div>
          </div>
        );
      })}
    </div>
  );
}

function getTargetIdFromPointer<T extends { id: string }>(
  clientY: number,
  items: T[],
  refs: Map<string, HTMLDivElement>,
  draggingId: string
) {
  const remaining = items.filter((item) => item.id !== draggingId);
  if (remaining.length === 0) return draggingId;

  for (const item of remaining) {
    const element = refs.get(item.id);
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (clientY < midpoint) return item.id;
  }

  return remaining[remaining.length - 1].id;
}
