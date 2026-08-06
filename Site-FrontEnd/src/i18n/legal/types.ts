export type LegalParagraph = { text: string; indent?: boolean };
export type LegalSection = { title: string; paragraphs: LegalParagraph[] };
export type LegalDocument = { lastUpdated: string; sections: LegalSection[] };
