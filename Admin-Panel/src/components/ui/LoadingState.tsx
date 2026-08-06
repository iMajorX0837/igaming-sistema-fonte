import { Loader2 } from 'lucide-react';
import PagePanel from './PagePanel';

interface LoadingStateProps {
  message?: string;
  className?: string;
  inline?: boolean;
}

export default function LoadingState({
  message = 'Carregando...',
  className = '',
  inline = false,
}: LoadingStateProps) {
  if (inline) {
    return (
      <div className={`flex items-center justify-center gap-3 py-12 ${className}`}>
        <Loader2 className="w-5 h-5 text-admin-foreground animate-spin" />
        <p className="text-admin-muted text-sm">{message}</p>
      </div>
    );
  }

  return (
    <PagePanel className={className}>
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 className="w-7 h-7 text-admin-foreground animate-spin" />
        <p className="text-admin-muted text-sm">{message}</p>
      </div>
    </PagePanel>
  );
}
