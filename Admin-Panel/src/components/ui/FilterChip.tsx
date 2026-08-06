interface FilterChipProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}

export default function FilterChip({ label, active = false, count, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
        active
          ? 'bg-admin-accent/12 text-admin-foreground border border-admin-accent/20'
          : 'bg-admin-panel text-admin-muted hover:text-admin-foreground hover:bg-admin-panel-2 border border-admin-border'
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] ${
            active ? 'bg-admin-accent/20 text-admin-foreground' : 'bg-admin-panel-3 text-admin-muted'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
