export default function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
        active ? 'bg-green-900/50 text-admin-success' : 'bg-gray-700 text-gray-400'
      }`}
    >
      {label}
    </span>
  );
}
