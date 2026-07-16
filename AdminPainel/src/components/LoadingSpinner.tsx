import { Loader2 } from 'lucide-react';

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-primary gap-4">
      <Loader2 className="w-10 h-10 text-admin-foreground animate-spin" />
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  );
}
