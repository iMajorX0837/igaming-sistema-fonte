import type { ReactNode } from 'react';

export const gatewayInputClassName =
  'w-full rounded-lg border border-admin-border bg-admin-panel-2 px-3 py-2.5 text-sm text-admin-foreground font-mono focus:outline-none focus:ring-2 focus:ring-admin-accent/30';

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-admin-foreground border-b border-admin-border pb-3">
      {children}
    </h2>
  );
}

export function ConfigStatusBadge({ configured }: { configured: boolean }) {
  return (
    <span className={configured ? 'text-emerald-400' : 'text-amber-400'}>
      {configured ? 'Configurada' : 'Não configurada'}
    </span>
  );
}

export function UpdatedAtFooter({ updatedAt }: { updatedAt: string | null }) {
  if (!updatedAt) return null;

  return (
    <p className="text-xs text-admin-muted">
      Última atualização: {new Date(updatedAt).toLocaleString('pt-BR')}
    </p>
  );
}

export function WebhookNote({ children }: { children: ReactNode }) {
  return <p className="text-xs text-admin-muted leading-relaxed">{children}</p>;
}
