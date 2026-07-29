import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';
import { useTranslation } from '../hooks/useTranslation';
import { getLegalDocumentsCopy, LEGAL_HEADER_DATE } from '../i18n/legal';
import { LegalPageHeader } from './LegalPageHeader';
import { LegalDocumentBody } from './LegalDocumentBody';

interface BettingTermsPageProps {
  onBack: () => void;
}

export default function BettingTermsPage({ onBack }: BettingTermsPageProps) {
  const { language, t } = useTranslation();
  const document = getLegalDocumentsCopy(language).bettingTerms;

  return (
    <AppPageScaffold>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <BackButton onClick={onBack} className="mb-6" />
        <LegalPageHeader title={t.legal.bettingTerms} date={LEGAL_HEADER_DATE[language]} />
        <LegalDocumentBody document={document} />
      </div>
      <Footer />
    </AppPageScaffold>
  );
}
