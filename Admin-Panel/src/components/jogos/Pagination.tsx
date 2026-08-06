import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 mt-4 border-t border-admin-border">
      <p className="text-gray-400 text-sm">
        Mostrando <span className="text-gray-300 font-medium">{start}-{end}</span> de{' '}
        <span className="text-gray-300 font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-admin-panel border border-admin-border text-white text-sm hover:bg-gray-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>
        <span className="text-gray-400 text-sm px-2 tabular-nums">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-admin-panel border border-admin-border text-white text-sm hover:bg-gray-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Próxima
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
