import type { CopyByLanguage } from '../types';
import type { LegalDocument } from './types';

export const KYC_CONTENT: CopyByLanguage<LegalDocument> = {
  pt: {
    lastUpdated: 'Última atualização: 17 de abril de 2025',
    sections: [
      { title: 'VISÃO GERAL KYC', paragraphs: [{ text: 'A Política KYC (Know Your Customer) do {nomeBet} estabelece os procedimentos e requisitos para verificação de identidade e conformidade de nossos usuários. Esta política está em conformidade com regulamentações brasileiras e internacionais de combate à fraude e lavagem de dinheiro.' }] },
      { title: 'PROCESSO DE VERIFICAÇÃO', paragraphs: [
        { text: 'Nível 1: Verificação Básica' }, { text: 'Requerido para criar uma conta e fazer apostas:' },
        { text: '• Nome completo', indent: true }, { text: '• Data de nascimento', indent: true }, { text: '• E-mail válido', indent: true }, { text: '• Número de telefone', indent: true },
        { text: 'Nível 2: Verificação Intermediária' }, { text: 'Requerida antes de saques acima de R$ 5.000:' },
        { text: '• Cópia do documento de identidade (CPF, RG ou CNH)', indent: true }, { text: '• Verificação de endereço (conta de utilidade ou extrato bancário)', indent: true }, { text: '• Selfie com documento de identidade', indent: true },
        { text: 'Nível 3: Verificação Avançada' }, { text: 'Requerida em casos de suspeita de atividade suspeita ou saques acima de R$ 20.000:' },
        { text: '• Comprovação de origem de fundos', indent: true }, { text: '• Extratos bancários dos últimos 3 meses', indent: true }, { text: '• Comprovação de emprego ou negócio', indent: true }, { text: '• Possível entrevista com equipe de compliance', indent: true },
      ] },
      { title: 'REQUISITOS DE ELEGIBILIDADE', paragraphs: [
        { text: 'Para passar na verificação KYC, você deve:' }, { text: '• Ter pelo menos 18 anos de idade', indent: true }, { text: '• Ser um cidadão brasileiro ou residente legal no Brasil', indent: true }, { text: '• Não estar em nenhuma lista de sanções internacionais', indent: true }, { text: '• Não ser politicamente exposto (PEP) ou estar associado a indivíduos PEP', indent: true }, { text: '• Possuir CPF válido e ativo', indent: true },
      ] },
      { title: 'DOCUMENTOS ACEITOS', paragraphs: [
        { text: 'Para verificação de identidade, aceitamos os seguintes documentos:' }, { text: '• CPF (Cadastro de Pessoa Física)', indent: true }, { text: '• RG (Registro Geral)', indent: true }, { text: '• CNH (Carteira Nacional de Habilitação)', indent: true }, { text: '• Passaporte', indent: true },
        { text: 'Documentos Devem:' }, { text: '• Ser originais e legíveis', indent: true }, { text: '• Estar válidos e não expirados', indent: true }, { text: '• Conter foto legível do titular', indent: true },
      ] },
      { title: 'VERIFICAÇÃO DE ENDEREÇO', paragraphs: [
        { text: 'Para comprovar seu endereço de residência, você pode fornecer:' }, { text: '• Conta de água, luz ou telefone', indent: true }, { text: '• Extrato bancário', indent: true }, { text: '• Contrato de aluguel ou comprovante de propriedade', indent: true }, { text: '• Declaração de imposto de renda', indent: true }, { text: 'O documento deve estar em seu nome e ter data de emissão não superior a 3 meses.' },
      ] },
      { title: 'TEMPO DE PROCESSAMENTO', paragraphs: [
        { text: '• Verificação Básica: Imediata' }, { text: '• Verificação Intermediária: 1-2 dias úteis' }, { text: '• Verificação Avançada: 3-5 dias úteis' }, { text: 'Em casos complexos, o processamento pode levar mais tempo. Você será notificado sobre o status de sua verificação.' },
      ] },
      { title: 'REJEIÇÃO DE VERIFICAÇÃO', paragraphs: [
        { text: 'Se sua verificação for rejeitada, você terá a oportunidade de:' }, { text: '• Receber explicação detalhada do motivo da rejeição', indent: true }, { text: '• Enviar novamente com informações ou documentos corrigidos', indent: true }, { text: '• Entrar em contato com nosso suporte para esclarecimentos', indent: true }, { text: 'Rejeições repetidas podem resultar no encerramento permanente da sua conta.' },
      ] },
      { title: 'PRIVACIDADE E SEGURANÇA', paragraphs: [{ text: 'Todos os documentos enviados são criptografados e armazenados com segurança. Seus dados pessoais são tratados conforme nossa Política de Privacidade e regulamentações aplicáveis.' }, { text: 'Os documentos são retentos conforme requisitos regulatórios e depois destruídos com segurança.' }] },
      { title: 'INFORMAÇÕES FALSAS', paragraphs: [
        { text: 'Fornecer informações falsas, documentos fraudulentos ou enganosos durante o processo KYC resultará em:' }, { text: '• Rejeição imediata da verificação', indent: true }, { text: '• Encerramento permanente da conta', indent: true }, { text: '• Confisco de todos os fundos', indent: true }, { text: '• Possível relatório às autoridades regulatórias', indent: true },
      ] },
    ],
  },
  en: {
    lastUpdated: 'Last updated: April 17, 2025',
    sections: [
      { title: 'KYC OVERVIEW', paragraphs: [{ text: 'The KYC (Know Your Customer) Policy of {nomeBet} sets out the procedures and requirements for verifying the identity and ensuring the compliance of our users. This policy complies with Brazilian and international anti-fraud and anti-money laundering regulations.' }] },
      { title: 'VERIFICATION PROCESS', paragraphs: [
        { text: 'Level 1: Basic Verification' }, { text: 'Required to create an account and place bets:' },
        { text: '• Full name', indent: true }, { text: '• Date of birth', indent: true }, { text: '• Valid email address', indent: true }, { text: '• Telephone number', indent: true },
        { text: 'Level 2: Intermediate Verification' }, { text: 'Required before withdrawals exceeding R$5,000:' },
        { text: '• Copy of an identity document (CPF, RG, or CNH)', indent: true }, { text: '• Proof of address (utility bill or bank statement)', indent: true }, { text: '• Selfie with identity document', indent: true },
        { text: 'Level 3: Advanced Verification' }, { text: 'Required in cases of suspected activity or withdrawals exceeding R$20,000:' },
        { text: '• Proof of source of funds', indent: true }, { text: '• Bank statements for the last 3 months', indent: true }, { text: '• Proof of employment or business', indent: true }, { text: '• Possible interview with the compliance team', indent: true },
      ] },
      { title: 'ELIGIBILITY REQUIREMENTS', paragraphs: [
        { text: 'To pass KYC verification, you must:' }, { text: '• Be at least 18 years old', indent: true }, { text: '• Be a Brazilian citizen or a legal resident of Brazil', indent: true }, { text: '• Not appear on any international sanctions list', indent: true }, { text: '• Not be a politically exposed person (PEP) or associated with PEPs', indent: true }, { text: '• Have a valid, active CPF', indent: true },
      ] },
      { title: 'ACCEPTED DOCUMENTS', paragraphs: [
        { text: 'For identity verification, we accept the following documents:' }, { text: '• CPF (Brazilian taxpayer identification number)', indent: true }, { text: '• RG (Brazilian identity card)', indent: true }, { text: '• CNH (Brazilian driver’s licence)', indent: true }, { text: '• Passport', indent: true },
        { text: 'Documents Must:' }, { text: '• Be original and legible', indent: true }, { text: '• Be valid and unexpired', indent: true }, { text: '• Contain a clear photograph of the holder', indent: true },
      ] },
      { title: 'ADDRESS VERIFICATION', paragraphs: [
        { text: 'To prove your residential address, you may provide:' }, { text: '• Water, electricity, or telephone bill', indent: true }, { text: '• Bank statement', indent: true }, { text: '• Lease agreement or proof of property ownership', indent: true }, { text: '• Income tax return', indent: true }, { text: 'The document must be in your name and issued no more than 3 months ago.' },
      ] },
      { title: 'PROCESSING TIME', paragraphs: [
        { text: '• Basic Verification: Immediate' }, { text: '• Intermediate Verification: 1–2 business days' }, { text: '• Advanced Verification: 3–5 business days' }, { text: 'In complex cases, processing may take longer. You will be notified of your verification status.' },
      ] },
      { title: 'VERIFICATION REJECTION', paragraphs: [
        { text: 'If your verification is rejected, you will have the opportunity to:' }, { text: '• Receive a detailed explanation of the reason for rejection', indent: true }, { text: '• Resubmit corrected information or documents', indent: true }, { text: '• Contact our support team for clarification', indent: true }, { text: 'Repeated rejections may result in the permanent closure of your account.' },
      ] },
      { title: 'PRIVACY AND SECURITY', paragraphs: [{ text: 'All submitted documents are encrypted and stored securely. Your personal data are processed in accordance with our Privacy Policy and applicable regulations.' }, { text: 'Documents are retained in accordance with regulatory requirements and then securely destroyed.' }] },
      { title: 'FALSE INFORMATION', paragraphs: [
        { text: 'Providing false information or fraudulent or misleading documents during the KYC process will result in:' }, { text: '• Immediate rejection of verification', indent: true }, { text: '• Permanent account closure', indent: true }, { text: '• Forfeiture of all funds', indent: true }, { text: '• Possible reporting to regulatory authorities', indent: true },
      ] },
    ],
  },
  es: {
    lastUpdated: 'Última actualización: 17 de abril de 2025',
    sections: [
      { title: 'VISIÓN GENERAL DE KYC', paragraphs: [{ text: 'La Política KYC (Know Your Customer) de {nomeBet} establece los procedimientos y requisitos para la verificación de identidad y el cumplimiento de nuestros usuarios. Esta política cumple con las regulaciones brasileñas e internacionales de lucha contra el fraude y el lavado de dinero.' }] },
      { title: 'PROCESO DE VERIFICACIÓN', paragraphs: [
        { text: 'Nivel 1: Verificación Básica' }, { text: 'Requerida para crear una cuenta y realizar apuestas:' },
        { text: '• Nombre completo', indent: true }, { text: '• Fecha de nacimiento', indent: true }, { text: '• Correo electrónico válido', indent: true }, { text: '• Número de teléfono', indent: true },
        { text: 'Nivel 2: Verificación Intermedia' }, { text: 'Requerida antes de retiros superiores a R$ 5.000:' },
        { text: '• Copia del documento de identidad (CPF, RG o CNH)', indent: true }, { text: '• Comprobante de domicilio (factura de servicios o extracto bancario)', indent: true }, { text: '• Selfie con documento de identidad', indent: true },
        { text: 'Nivel 3: Verificación Avanzada' }, { text: 'Requerida en casos de actividad sospechosa o retiros superiores a R$ 20.000:' },
        { text: '• Comprobante del origen de los fondos', indent: true }, { text: '• Extractos bancarios de los últimos 3 meses', indent: true }, { text: '• Comprobante de empleo o negocio', indent: true }, { text: '• Posible entrevista con el equipo de cumplimiento', indent: true },
      ] },
      { title: 'REQUISITOS DE ELEGIBILIDAD', paragraphs: [
        { text: 'Para superar la verificación KYC, debe:' }, { text: '• Tener al menos 18 años de edad', indent: true }, { text: '• Ser ciudadano brasileño o residente legal en Brasil', indent: true }, { text: '• No figurar en ninguna lista de sanciones internacionales', indent: true }, { text: '• No ser una persona políticamente expuesta (PEP) ni estar asociado con personas PEP', indent: true }, { text: '• Tener un CPF válido y activo', indent: true },
      ] },
      { title: 'DOCUMENTOS ACEPTADOS', paragraphs: [
        { text: 'Para la verificación de identidad, aceptamos los siguientes documentos:' }, { text: '• CPF (registro de contribuyente brasileño)', indent: true }, { text: '• RG (documento nacional de identidad brasileño)', indent: true }, { text: '• CNH (licencia de conducir brasileña)', indent: true }, { text: '• Pasaporte', indent: true },
        { text: 'Los Documentos Deben:' }, { text: '• Ser originales y legibles', indent: true }, { text: '• Ser válidos y no estar vencidos', indent: true }, { text: '• Contener una fotografía legible del titular', indent: true },
      ] },
      { title: 'VERIFICACIÓN DE DOMICILIO', paragraphs: [
        { text: 'Para comprobar su domicilio, puede proporcionar:' }, { text: '• Factura de agua, electricidad o teléfono', indent: true }, { text: '• Extracto bancario', indent: true }, { text: '• Contrato de alquiler o comprobante de propiedad', indent: true }, { text: '• Declaración de impuesto sobre la renta', indent: true }, { text: 'El documento debe estar a su nombre y tener una fecha de emisión no superior a 3 meses.' },
      ] },
      { title: 'TIEMPO DE PROCESAMIENTO', paragraphs: [
        { text: '• Verificación Básica: Inmediata' }, { text: '• Verificación Intermedia: 1–2 días hábiles' }, { text: '• Verificación Avanzada: 3–5 días hábiles' }, { text: 'En casos complejos, el procesamiento puede tardar más. Se le notificará el estado de su verificación.' },
      ] },
      { title: 'RECHAZO DE LA VERIFICACIÓN', paragraphs: [
        { text: 'Si su verificación es rechazada, tendrá la oportunidad de:' }, { text: '• Recibir una explicación detallada del motivo del rechazo', indent: true }, { text: '• Volver a enviarla con información o documentos corregidos', indent: true }, { text: '• Ponerse en contacto con nuestro soporte para recibir aclaraciones', indent: true }, { text: 'Los rechazos repetidos pueden dar lugar al cierre permanente de su cuenta.' },
      ] },
      { title: 'PRIVACIDAD Y SEGURIDAD', paragraphs: [{ text: 'Todos los documentos enviados se cifran y almacenan de forma segura. Sus datos personales se tratan de acuerdo con nuestra Política de Privacidad y las regulaciones aplicables.' }, { text: 'Los documentos se conservan de acuerdo con los requisitos regulatorios y luego se destruyen de forma segura.' }] },
      { title: 'INFORMACIÓN FALSA', paragraphs: [
        { text: 'Proporcionar información falsa o documentos fraudulentos o engañosos durante el proceso KYC resultará en:' }, { text: '• Rechazo inmediato de la verificación', indent: true }, { text: '• Cierre permanente de la cuenta', indent: true }, { text: '• Confiscación de todos los fondos', indent: true }, { text: '• Posible reporte a las autoridades regulatorias', indent: true },
      ] },
    ],
  },
};
