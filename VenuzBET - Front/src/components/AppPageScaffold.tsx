import type { ReactNode } from 'react';
import { useHomeConfig } from '../hooks/useHomeConfig';

interface AppPageScaffoldProps {
  children: ReactNode;
}

/** Wrapper de conteúdo rolável — Header/Sidebar ficam no AppShellLayout. */
export default function AppPageScaffold({ children }: AppPageScaffoldProps) {
  const { config: homeConfig } = useHomeConfig();

  return (
    <div
      className="flex-1 overflow-y-auto min-h-0 [container-type:inline-size]"
      style={{ backgroundColor: homeConfig.fundo }}
    >
      {children}
    </div>
  );
}
