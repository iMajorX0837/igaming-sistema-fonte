import { FileText, Calendar } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

export default function PrivacyPolicyPage({ onBack }: PrivacyPolicyPageProps) {

  return (
    <AppPageScaffold>
          <div className="max-w-5xl mx-auto px-6 py-8">
            <BackButton onClick={onBack} className="mb-6" />

            <h1 className="text-white text-3xl font-bold mb-6">Política de Privacidade</h1>

            <div className="border-t border-b border-slate-700/50 py-4 mb-8 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <FileText className="w-4 h-4" />
                <span className="font-medium">Versão:</span>
                <span className="text-white">1.0</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Data:</span>
                <span className="text-white">17 abr. 2025</span>
              </div>
            </div>

            <div className="space-y-8 text-slate-300 leading-relaxed">
              <section>
                <h2 className="text-white text-xl font-bold mb-4">INTRODUÇÃO</h2>
                <div className="space-y-4">
                  <p>
                    O Royal Bet ("nós", "nosso", "empresa") está comprometido em proteger sua privacidade. Esta Política de Privacidade explica como coletamos, usamos,
                    divulgamos e protegemos suas informações.
                  </p>
                  <p>
                    Por favor, leia esta política com atenção. Ao acessar e usar a plataforma Royal Bet, você concorda com as práticas descritas neste documento.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">INFORMAÇÕES QUE COLETAMOS</h2>
                <div className="space-y-4">
                  <p className="font-semibold text-white">Informações Fornecidas por Você:</p>
                  <p>
                    Quando você cria uma conta ou usa nossa plataforma, podemos coletar informações como:
                  </p>
                  <p className="pl-4">
                    • Nome completo
                  </p>
                  <p className="pl-4">
                    • Endereço de e-mail
                  </p>
                  <p className="pl-4">
                    • Data de nascimento
                  </p>
                  <p className="pl-4">
                    • Número de documento de identidade (CPF, RG, etc.)
                  </p>
                  <p className="pl-4">
                    • Endereço residencial
                  </p>
                  <p className="pl-4">
                    • Número de telefone
                  </p>
                  <p className="pl-4">
                    • Informações de conta bancária/PIX
                  </p>

                  <p className="font-semibold text-white mt-6">Informações Coletadas Automaticamente:</p>
                  <p>
                    Quando você usa nossa plataforma, podemos coletar automaticamente:
                  </p>
                  <p className="pl-4">
                    • Endereço IP
                  </p>
                  <p className="pl-4">
                    • Tipo e versão do navegador
                  </p>
                  <p className="pl-4">
                    • Tipo de dispositivo
                  </p>
                  <p className="pl-4">
                    • Páginas visitadas
                  </p>
                  <p className="pl-4">
                    • Horário e duração das visitas
                  </p>
                  <p className="pl-4">
                    • Cookies e identificadores similares
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">USO DE INFORMAÇÕES</h2>
                <div className="space-y-4">
                  <p>
                    Utilizamos as informações coletadas para:
                  </p>
                  <p className="pl-4">
                    • Criar e manter sua conta
                  </p>
                  <p className="pl-4">
                    • Processar transações
                  </p>
                  <p className="pl-4">
                    • Verificar sua identidade e conformidade com regulamentações
                  </p>
                  <p className="pl-4">
                    • Melhorar nossos serviços
                  </p>
                  <p className="pl-4">
                    • Enviar atualizações de segurança e suporte técnico
                  </p>
                  <p className="pl-4">
                    • Comunicações de marketing (com consentimento)
                  </p>
                  <p className="pl-4">
                    • Conformidade legal e regulatória
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">COMPARTILHAMENTO DE INFORMAÇÕES</h2>
                <div className="space-y-4">
                  <p>
                    Compartilhamos suas informações apenas conforme necessário:
                  </p>
                  <p className="pl-4">
                    • Com prestadores de serviços de terceiros (processadores de pagamento, provedores de hospedagem)
                  </p>
                  <p className="pl-4">
                    • Com autoridades regulatórias e órgãos governamentais quando obrigados por lei
                  </p>
                  <p className="pl-4">
                    • Quando necessário para proteger direitos, privacidade, segurança ou propriedade
                  </p>
                  <p>
                    Não vendemos suas informações pessoais a terceiros para fins de marketing.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">SEGURANÇA</h2>
                <div className="space-y-4">
                  <p>
                    Implementamos medidas de segurança técnicas, administrativas e físicas para proteger suas informações contra acesso não autorizado, alteração,
                    divulgação ou destruição.
                  </p>
                  <p>
                    Apesar de nossos melhores esforços, nenhum método de transmissão de dados pela internet é 100% seguro. Você usa a plataforma por sua conta e risco.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">RETENÇÃO DE DADOS</h2>
                <div className="space-y-4">
                  <p>
                    Mantemos suas informações pessoais pelo tempo necessário para fornecer nossos serviços e cumprir obrigações legais. Normalmente, retemos dados por
                    um período mínimo de 5 anos para fins de conformidade regulatória.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">SEUS DIREITOS</h2>
                <div className="space-y-4">
                  <p>
                    Você tem o direito de:
                  </p>
                  <p className="pl-4">
                    • Acessar suas informações pessoais
                  </p>
                  <p className="pl-4">
                    • Corrigir informações imprecisas
                  </p>
                  <p className="pl-4">
                    • Solicitar a exclusão de seus dados (sob certas circunstâncias)
                  </p>
                  <p className="pl-4">
                    • Optar por não receber comunicações de marketing
                  </p>
                  <p>
                    Para exercer estes direitos, entre em contato conosco através dos canais de suporte disponibilizados.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">COOKIES</h2>
                <div className="space-y-4">
                  <p>
                    Usamos cookies para melhorar sua experiência na plataforma. Você pode controlar o uso de cookies através das configurações do seu navegador, mas isso
                    pode afetar a funcionalidade da plataforma.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">ALTERAÇÕES NESTA POLÍTICA</h2>
                <div className="space-y-4">
                  <p>
                    Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas através de e-mail ou por aviso
                    destacado na plataforma.
                  </p>
                </div>
              </section>

              <section className="pt-6 border-t border-slate-700/50 mb-8">
                <p className="text-sm text-slate-400 text-center">
                  Última atualização: 17 de abril de 2025
                </p>
              </section>
            </div>
          </div>

          <Footer />
    </AppPageScaffold>
  );
}
