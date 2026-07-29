import { useSiteBrand } from '../hooks/useSiteBrand';
import { interpolate } from '../i18n/types';
import type { LegalDocument } from '../i18n/legal/types';

interface LegalDocumentBodyProps {
  document: LegalDocument;
}

export function LegalDocumentBody({ document }: LegalDocumentBodyProps) {
  const { nomeBet } = useSiteBrand();

  const replaceBrand = (text: string) => interpolate(text, { nomeBet });

  return (
    <div className="space-y-8 text-slate-300 leading-relaxed">
      {document.sections.map((section, sectionIndex) => (
        <section key={sectionIndex}>
          <h2 className="text-white text-xl font-bold mb-4">{replaceBrand(section.title)}</h2>
          <div className="space-y-4">
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex} className={paragraph.indent ? 'pl-4' : undefined}>
                {replaceBrand(paragraph.text)}
              </p>
            ))}
          </div>
        </section>
      ))}

      <section className="pt-6 border-t border-slate-700/50 mb-8">
        <p className="text-sm text-slate-400 text-center">{replaceBrand(document.lastUpdated)}</p>
      </section>
    </div>
  );
}
