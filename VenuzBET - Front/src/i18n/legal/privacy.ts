import type { CopyByLanguage } from '../types';
import type { LegalDocument } from './types';

export const PRIVACY_CONTENT: CopyByLanguage<LegalDocument> = {
  pt: {
    lastUpdated: 'Última atualização: 17 de abril de 2025',
    sections: [
      {
        title: 'INTRODUÇÃO',
        paragraphs: [
          {
            text: 'O {nomeBet} ("nós", "nosso", "empresa") está comprometido em proteger sua privacidade. Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações.',
          },
          {
            text: 'Por favor, leia esta política com atenção. Ao acessar e usar a plataforma {nomeBet}, você concorda com as práticas descritas neste documento.',
          },
        ],
      },
      {
        title: 'INFORMAÇÕES QUE COLETAMOS',
        paragraphs: [
          { text: 'Informações Fornecidas por Você:' },
          { text: 'Quando você cria uma conta ou usa nossa plataforma, podemos coletar informações como:' },
          { text: '• Nome completo', indent: true },
          { text: '• Endereço de e-mail', indent: true },
          { text: '• Data de nascimento', indent: true },
          { text: '• Número de documento de identidade (CPF, RG, etc.)', indent: true },
          { text: '• Endereço residencial', indent: true },
          { text: '• Número de telefone', indent: true },
          { text: '• Informações de conta bancária/PIX', indent: true },
          { text: 'Informações Coletadas Automaticamente:' },
          { text: 'Quando você usa nossa plataforma, podemos coletar automaticamente:' },
          { text: '• Endereço IP', indent: true },
          { text: '• Tipo e versão do navegador', indent: true },
          { text: '• Tipo de dispositivo', indent: true },
          { text: '• Páginas visitadas', indent: true },
          { text: '• Horário e duração das visitas', indent: true },
          { text: '• Cookies e identificadores similares', indent: true },
        ],
      },
      {
        title: 'USO DE INFORMAÇÕES',
        paragraphs: [
          { text: 'Utilizamos as informações coletadas para:' },
          { text: '• Criar e manter sua conta', indent: true },
          { text: '• Processar transações', indent: true },
          { text: '• Verificar sua identidade e conformidade com regulamentações', indent: true },
          { text: '• Melhorar nossos serviços', indent: true },
          { text: '• Enviar atualizações de segurança e suporte técnico', indent: true },
          { text: '• Comunicações de marketing (com consentimento)', indent: true },
          { text: '• Conformidade legal e regulatória', indent: true },
        ],
      },
      {
        title: 'COMPARTILHAMENTO DE INFORMAÇÕES',
        paragraphs: [
          { text: 'Compartilhamos suas informações apenas conforme necessário:' },
          {
            text: '• Com prestadores de serviços de terceiros (processadores de pagamento, provedores de hospedagem)',
            indent: true,
          },
          { text: '• Com autoridades regulatórias e órgãos governamentais quando obrigados por lei', indent: true },
          { text: '• Quando necessário para proteger direitos, privacidade, segurança ou propriedade', indent: true },
          { text: 'Não vendemos suas informações pessoais a terceiros para fins de marketing.' },
        ],
      },
      {
        title: 'SEGURANÇA',
        paragraphs: [
          {
            text: 'Implementamos medidas de segurança técnicas, administrativas e físicas para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição.',
          },
          {
            text: 'Apesar de nossos melhores esforços, nenhum método de transmissão de dados pela internet é 100% seguro. Você usa a plataforma por sua conta e risco.',
          },
        ],
      },
      {
        title: 'RETENÇÃO DE DADOS',
        paragraphs: [
          {
            text: 'Mantemos suas informações pessoais pelo tempo necessário para fornecer nossos serviços e cumprir obrigações legais. Normalmente, retemos dados por um período mínimo de 5 anos para fins de conformidade regulatória.',
          },
        ],
      },
      {
        title: 'SEUS DIREITOS',
        paragraphs: [
          { text: 'Você tem o direito de:' },
          { text: '• Acessar suas informações pessoais', indent: true },
          { text: '• Corrigir informações imprecisas', indent: true },
          { text: '• Solicitar a exclusão de seus dados (sob certas circunstâncias)', indent: true },
          { text: '• Optar por não receber comunicações de marketing', indent: true },
          {
            text: 'Para exercer estes direitos, entre em contato conosco através dos canais de suporte disponibilizados.',
          },
        ],
      },
      {
        title: 'COOKIES',
        paragraphs: [
          {
            text: 'Usamos cookies para melhorar sua experiência na plataforma. Você pode controlar o uso de cookies através das configurações do seu navegador, mas isso pode afetar a funcionalidade da plataforma.',
          },
        ],
      },
      {
        title: 'ALTERAÇÕES NESTA POLÍTICA',
        paragraphs: [
          {
            text: 'Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas através de e-mail ou por aviso destacado na plataforma.',
          },
        ],
      },
    ],
  },
  en: {
    lastUpdated: 'Last updated: April 17, 2025',
    sections: [
      {
        title: 'INTRODUCTION',
        paragraphs: [
          {
            text: '{nomeBet} ("we", "our", "company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your information.',
          },
          {
            text: 'Please read this policy carefully. By accessing and using the {nomeBet} platform, you agree to the practices described in this document.',
          },
        ],
      },
      {
        title: 'INFORMATION WE COLLECT',
        paragraphs: [
          { text: 'Information You Provide:' },
          { text: 'When you create an account or use our platform, we may collect information such as:' },
          { text: '• Full name', indent: true },
          { text: '• Email address', indent: true },
          { text: '• Date of birth', indent: true },
          { text: '• Identity document number (CPF, RG, etc.)', indent: true },
          { text: '• Residential address', indent: true },
          { text: '• Phone number', indent: true },
          { text: '• Bank account/PIX information', indent: true },
          { text: 'Information Collected Automatically:' },
          { text: 'When you use our platform, we may automatically collect:' },
          { text: '• IP address', indent: true },
          { text: '• Browser type and version', indent: true },
          { text: '• Device type', indent: true },
          { text: '• Pages visited', indent: true },
          { text: '• Time and duration of visits', indent: true },
          { text: '• Cookies and similar identifiers', indent: true },
        ],
      },
      {
        title: 'USE OF INFORMATION',
        paragraphs: [
          { text: 'We use the information collected to:' },
          { text: '• Create and maintain your account', indent: true },
          { text: '• Process transactions', indent: true },
          { text: '• Verify your identity and regulatory compliance', indent: true },
          { text: '• Improve our services', indent: true },
          { text: '• Send security updates and technical support', indent: true },
          { text: '• Marketing communications (with consent)', indent: true },
          { text: '• Legal and regulatory compliance', indent: true },
        ],
      },
      {
        title: 'INFORMATION SHARING',
        paragraphs: [
          { text: 'We share your information only as necessary:' },
          { text: '• With third-party service providers (payment processors, hosting providers)', indent: true },
          { text: '• With regulatory authorities and government bodies when required by law', indent: true },
          { text: '• When necessary to protect rights, privacy, security, or property', indent: true },
          { text: 'We do not sell your personal information to third parties for marketing purposes.' },
        ],
      },
      {
        title: 'SECURITY',
        paragraphs: [
          {
            text: 'We implement technical, administrative, and physical security measures to protect your information against unauthorized access, alteration, disclosure, or destruction.',
          },
          {
            text: 'Despite our best efforts, no method of data transmission over the internet is 100% secure. You use the platform at your own risk.',
          },
        ],
      },
      {
        title: 'DATA RETENTION',
        paragraphs: [
          {
            text: 'We retain your personal information for as long as necessary to provide our services and fulfill legal obligations. We typically retain data for a minimum period of 5 years for regulatory compliance purposes.',
          },
        ],
      },
      {
        title: 'YOUR RIGHTS',
        paragraphs: [
          { text: 'You have the right to:' },
          { text: '• Access your personal information', indent: true },
          { text: '• Correct inaccurate information', indent: true },
          { text: '• Request deletion of your data (under certain circumstances)', indent: true },
          { text: '• Opt out of marketing communications', indent: true },
          {
            text: 'To exercise these rights, contact us through the support channels provided.',
          },
        ],
      },
      {
        title: 'COOKIES',
        paragraphs: [
          {
            text: 'We use cookies to improve your experience on the platform. You can control cookie use through your browser settings, but this may affect platform functionality.',
          },
        ],
      },
      {
        title: 'CHANGES TO THIS POLICY',
        paragraphs: [
          {
            text: 'We may update this Privacy Policy periodically. We will notify you of significant changes via email or through a prominent notice on the platform.',
          },
        ],
      },
    ],
  },
  es: {
    lastUpdated: 'Última actualización: 17 de abril de 2025',
    sections: [
      {
        title: 'INTRODUCCIÓN',
        paragraphs: [
          {
            text: '{nomeBet} ("nosotros", "nuestro", "empresa") está comprometido con proteger su privacidad. Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y protegemos su información.',
          },
          {
            text: 'Por favor, lea esta política con atención. Al acceder y usar la plataforma {nomeBet}, usted acepta las prácticas descritas en este documento.',
          },
        ],
      },
      {
        title: 'INFORMACIÓN QUE RECOPILAMOS',
        paragraphs: [
          { text: 'Información Proporcionada por Usted:' },
          { text: 'Cuando crea una cuenta o usa nuestra plataforma, podemos recopilar información como:' },
          { text: '• Nombre completo', indent: true },
          { text: '• Dirección de correo electrónico', indent: true },
          { text: '• Fecha de nacimiento', indent: true },
          { text: '• Número de documento de identidad (CPF, RG, etc.)', indent: true },
          { text: '• Dirección residencial', indent: true },
          { text: '• Número de teléfono', indent: true },
          { text: '• Información de cuenta bancaria/PIX', indent: true },
          { text: 'Información Recopilada Automáticamente:' },
          { text: 'Cuando usa nuestra plataforma, podemos recopilar automáticamente:' },
          { text: '• Dirección IP', indent: true },
          { text: '• Tipo y versión del navegador', indent: true },
          { text: '• Tipo de dispositivo', indent: true },
          { text: '• Páginas visitadas', indent: true },
          { text: '• Horario y duración de las visitas', indent: true },
          { text: '• Cookies e identificadores similares', indent: true },
        ],
      },
      {
        title: 'USO DE LA INFORMACIÓN',
        paragraphs: [
          { text: 'Utilizamos la información recopilada para:' },
          { text: '• Crear y mantener su cuenta', indent: true },
          { text: '• Procesar transacciones', indent: true },
          { text: '• Verificar su identidad y cumplimiento normativo', indent: true },
          { text: '• Mejorar nuestros servicios', indent: true },
          { text: '• Enviar actualizaciones de seguridad y soporte técnico', indent: true },
          { text: '• Comunicaciones de marketing (con consentimiento)', indent: true },
          { text: '• Cumplimiento legal y regulatorio', indent: true },
        ],
      },
      {
        title: 'COMPARTICIÓN DE INFORMACIÓN',
        paragraphs: [
          { text: 'Compartimos su información solo según sea necesario:' },
          {
            text: '• Con proveedores de servicios de terceros (procesadores de pago, proveedores de alojamiento)',
            indent: true,
          },
          { text: '• Con autoridades regulatorias y organismos gubernamentales cuando la ley lo exija', indent: true },
          { text: '• Cuando sea necesario para proteger derechos, privacidad, seguridad o propiedad', indent: true },
          { text: 'No vendemos su información personal a terceros con fines de marketing.' },
        ],
      },
      {
        title: 'SEGURIDAD',
        paragraphs: [
          {
            text: 'Implementamos medidas de seguridad técnicas, administrativas y físicas para proteger su información contra acceso no autorizado, alteración, divulgación o destrucción.',
          },
          {
            text: 'A pesar de nuestros mejores esfuerzos, ningún método de transmisión de datos por internet es 100% seguro. Usted usa la plataforma bajo su propio riesgo.',
          },
        ],
      },
      {
        title: 'RETENCIÓN DE DATOS',
        paragraphs: [
          {
            text: 'Mantenemos su información personal durante el tiempo necesario para proporcionar nuestros servicios y cumplir obligaciones legales. Normalmente, retenemos datos por un período mínimo de 5 años con fines de cumplimiento regulatorio.',
          },
        ],
      },
      {
        title: 'SUS DERECHOS',
        paragraphs: [
          { text: 'Usted tiene derecho a:' },
          { text: '• Acceder a su información personal', indent: true },
          { text: '• Corregir información inexacta', indent: true },
          { text: '• Solicitar la eliminación de sus datos (bajo ciertas circunstancias)', indent: true },
          { text: '• Optar por no recibir comunicaciones de marketing', indent: true },
          {
            text: 'Para ejercer estos derechos, contáctenos a través de los canales de soporte disponibles.',
          },
        ],
      },
      {
        title: 'COOKIES',
        paragraphs: [
          {
            text: 'Usamos cookies para mejorar su experiencia en la plataforma. Puede controlar el uso de cookies a través de la configuración de su navegador, pero esto puede afectar la funcionalidad de la plataforma.',
          },
        ],
      },
      {
        title: 'CAMBIOS EN ESTA POLÍTICA',
        paragraphs: [
          {
            text: 'Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos sobre cambios significativos por correo electrónico o mediante un aviso destacado en la plataforma.',
          },
        ],
      },
    ],
  },
};
