import type { CopyByLanguage } from '../types';
import type { LegalDocument } from './types';
import { TERMS_CONTENT } from './terms';
import { BETTING_TERMS_CONTENT } from './bettingTerms';
import { PRIVACY_CONTENT } from './privacy';
import { KYC_CONTENT } from './kyc';
import { AML_CONTENT } from './aml';
import { RESPONSIBLE_GAMING_CONTENT } from './responsibleGaming';

export type LegalDocumentsCopy = {
  terms: LegalDocument;
  bettingTerms: LegalDocument;
  privacy: LegalDocument;
  kyc: LegalDocument;
  aml: LegalDocument;
  responsibleGaming: LegalDocument;
};

export const LEGAL_HEADER_DATE: CopyByLanguage<string> = {
  pt: '17 abr. 2025',
  en: 'Apr 17, 2025',
  es: '17 abr. 2025',
};

const LEGAL_DOCUMENTS: CopyByLanguage<LegalDocumentsCopy> = {
  pt: {
    terms: TERMS_CONTENT.pt,
    bettingTerms: BETTING_TERMS_CONTENT.pt,
    privacy: PRIVACY_CONTENT.pt,
    kyc: KYC_CONTENT.pt,
    aml: AML_CONTENT.pt,
    responsibleGaming: RESPONSIBLE_GAMING_CONTENT.pt,
  },
  en: {
    terms: TERMS_CONTENT.en,
    bettingTerms: BETTING_TERMS_CONTENT.en,
    privacy: PRIVACY_CONTENT.en,
    kyc: KYC_CONTENT.en,
    aml: AML_CONTENT.en,
    responsibleGaming: RESPONSIBLE_GAMING_CONTENT.en,
  },
  es: {
    terms: TERMS_CONTENT.es,
    bettingTerms: BETTING_TERMS_CONTENT.es,
    privacy: PRIVACY_CONTENT.es,
    kyc: KYC_CONTENT.es,
    aml: AML_CONTENT.es,
    responsibleGaming: RESPONSIBLE_GAMING_CONTENT.es,
  },
};

export function getLegalDocumentsCopy(lang: keyof typeof LEGAL_DOCUMENTS): LegalDocumentsCopy {
  return LEGAL_DOCUMENTS[lang] ?? LEGAL_DOCUMENTS.pt;
}

export {
  TERMS_CONTENT,
  BETTING_TERMS_CONTENT,
  PRIVACY_CONTENT,
  KYC_CONTENT,
  AML_CONTENT,
  RESPONSIBLE_GAMING_CONTENT,
};
