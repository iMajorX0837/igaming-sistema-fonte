import { FileText, Calendar } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface LegalPageHeaderProps {
  title: string;
  version?: string;
  date?: string;
}

export function LegalPageHeader({ title, version = '1.0', date = '17 abr. 2025' }: LegalPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      <h1 className="text-white text-3xl font-bold mb-6">{title}</h1>
      <div className="border-t border-b border-slate-700/50 py-4 mb-8 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <FileText className="w-4 h-4" />
          <span className="font-medium">{t.common.version}</span>
          <span className="text-white">{version}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Calendar className="w-4 h-4" />
          <span className="font-medium">{t.common.date}</span>
          <span className="text-white">{date}</span>
        </div>
      </div>
    </>
  );
}

interface LegalPageLayoutProps {
  title: string;
  onBack: () => void;
  children: ReactNode;
}

export default function LegalPageLayout({ title, children }: Omit<LegalPageLayoutProps, 'onBack'>) {
  return (
    <>
      <LegalPageHeader title={title} />
      <div className="space-y-8 text-slate-300 leading-relaxed">{children}</div>
    </>
  );
}
