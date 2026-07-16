import { FileText, Calendar } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';

interface TermsPageProps {
  onBack: () => void;
}

export default function TermsPage({ onBack }: TermsPageProps) {

  return (
    <AppPageScaffold>
          <div className="max-w-5xl mx-auto px-6 py-8">
            <BackButton onClick={onBack} className="mb-6" />

            <h1 className="text-white text-3xl font-bold mb-6">Termos & Condições</h1>

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
                    Estes Termos e Condições e os documentos nele mencionados (os "Termos") estabelecem as diretrizes para a operação do site disponível na URL
                    (denominado o "Site") e a prestação de seus serviços integrados (coletivamente chamados de "Serviço").
                  </p>
                  <p>
                    Leia estes Termos com atenção, pois eles constituem um acordo legal vinculativo entre você, que é nosso cliente (o "Cliente" ou "você"), e nós, que
                    operamos o Royal Bet. Ao abrir uma conta (a "Conta") em nossa plataforma e utilizar o Serviço, você confirma que leu, compreendeu e concorda
                    integralmente com estes Termos.
                  </p>
                  <p>
                    O Serviço é fornecido pelo Royal Bet, empresa autorizada a operar apostas de quota fixa no Brasil, conforme regulamentação da Secretaria de Prêmios e
                    Apostas do Ministério da Fazenda.
                  </p>
                  <p>
                    Todo o uso do Site e da Plataforma do Royal Bet está sujeito a estes Termos e Condições.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">TERMOS GERAIS</h2>
                <div className="space-y-4">
                  <p>
                    Reservamo-nos o direito de alterar estes Termos, incluindo os documentos nele mencionados, a qualquer momento. As modificações serão comunicadas
                    previamente por meio do seu endereço de e-mail cadastrado.
                  </p>
                  <p>
                    Caso não concorde com as alterações realizadas, você deverá interromper imediatamente o uso do Serviço. A continuidade do uso após a comunicação
                    das mudanças indicará o seu aceite aos novos Termos.
                  </p>
                  <p>
                    Se tiver dúvidas sobre a utilização do Serviço, recomendamos consultar estes Termos. Caso a dúvida persista, entre em contato com o nosso Serviço de
                    Atendimento ao Cliente ("Suporte") pelos canais disponíveis em nossa plataforma ou pelo e-mail.
                  </p>
                  <p>
                    Os Termos e Condições aqui expostos se aplicam a toda e qualquer utilização do Serviço, incluindo:
                  </p>
                  <p className="pl-4">
                    (i) Regras gerais dos produtos de apostas esportivas, disponíveis na seção de Esportes da plataforma;
                  </p>
                  <p className="pl-4">
                    (ii) Regras gerais dos jogos de Cassino Online, acessíveis nas interfaces individuais de cada jogo;
                  </p>
                  <p className="pl-4">
                    (iii) Política de Privacidade, disponível no rodapé do site;
                  </p>
                  <p className="pl-4">
                    (iv) Política de Prevenção à Lavagem de Dinheiro, disponível no rodapé do site;
                  </p>
                  <p className="pl-4">
                    (v) Política de Jogo Responsável, acessível através da Central de Jogo Responsável localizada no rodapé do site.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">ELEGIBILIDADE</h2>
                <div className="space-y-4">
                  <p>
                    Para utilizar nossos serviços, você deve ter pelo menos 18 anos de idade e possuir capacidade legal plena para celebrar contratos vinculativos.
                  </p>
                  <p>
                    Ao criar uma conta, você declara e garante que todas as informações fornecidas são verdadeiras, precisas e completas. É sua responsabilidade manter
                    seus dados atualizados.
                  </p>
                  <p>
                    Reservamo-nos o direito de solicitar documentação comprobatória de identidade, idade e residência a qualquer momento. A recusa em fornecer tais
                    documentos pode resultar na suspensão ou encerramento da sua conta.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">USO DA CONTA</h2>
                <div className="space-y-4">
                  <p>
                    Cada usuário pode manter apenas uma conta ativa. A criação de múltiplas contas é estritamente proibida e resultará no encerramento de todas as contas
                    associadas e confisco de quaisquer ganhos.
                  </p>
                  <p>
                    Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. Notifique-nos
                    imediatamente sobre qualquer uso não autorizado.
                  </p>
                  <p>
                    Não é permitido transferir, vender ou ceder sua conta a terceiros. Qualquer tentativa de fazê-lo resultará no encerramento imediato da conta.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">DEPÓSITOS E SAQUES</h2>
                <div className="space-y-4">
                  <p>
                    Todos os depósitos e saques devem ser realizados através dos métodos de pagamento disponibilizados na plataforma. Aceitamos principalmente
                    transferências via PIX para garantir transações rápidas e seguras.
                  </p>
                  <p>
                    Os depósitos são processados instantaneamente na maioria dos casos. Os saques são processados de acordo com nossos procedimentos de segurança e
                    podem levar até 24 horas úteis para serem concluídos.
                  </p>
                  <p>
                    Reservamo-nos o direito de solicitar verificação de identidade antes de processar saques, especialmente para valores significativos ou em casos de
                    suspeita de atividade fraudulenta.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">CONDUTA DO USUÁRIO</h2>
                <div className="space-y-4">
                  <p>
                    Ao utilizar nossos serviços, você concorda em não se envolver em atividades fraudulentas, abusivas ou ilegais. Isso inclui, mas não se limita a:
                  </p>
                  <p className="pl-4">
                    • Uso de software automatizado ou bots para realizar apostas;
                  </p>
                  <p className="pl-4">
                    • Exploração de erros ou falhas do sistema;
                  </p>
                  <p className="pl-4">
                    • Lavagem de dinheiro ou outras atividades financeiras ilícitas;
                  </p>
                  <p className="pl-4">
                    • Colusão com outros jogadores;
                  </p>
                  <p className="pl-4">
                    • Comportamento abusivo ou ofensivo em relação a outros usuários ou nossa equipe.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">LIMITAÇÕES DE RESPONSABILIDADE</h2>
                <div className="space-y-4">
                  <p>
                    Não nos responsabilizamos por perdas decorrentes de:
                  </p>
                  <p className="pl-4">
                    • Interrupções ou falhas técnicas no serviço;
                  </p>
                  <p className="pl-4">
                    • Perda de dados ou informações;
                  </p>
                  <p className="pl-4">
                    • Acesso não autorizado à sua conta devido a negligência na proteção de suas credenciais;
                  </p>
                  <p className="pl-4">
                    • Decisões de apostas baseadas em informações ou cotações incorretas exibidas devido a erros técnicos.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">ENCERRAMENTO DE CONTA</h2>
                <div className="space-y-4">
                  <p>
                    Você pode solicitar o encerramento de sua conta a qualquer momento entrando em contato com nosso Suporte. Processaremos sua solicitação após a
                    conclusão de quaisquer apostas pendentes e o saque de fundos remanescentes.
                  </p>
                  <p>
                    Reservamo-nos o direito de suspender ou encerrar sua conta imediatamente, sem aviso prévio, se você violar estes Termos ou se suspeitarmos de
                    atividade fraudulenta ou ilegal.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">PROPRIEDADE INTELECTUAL</h2>
                <div className="space-y-4">
                  <p>
                    Todo o conteúdo disponível no Site, incluindo textos, gráficos, logos, imagens, vídeos e software, é de propriedade exclusiva do Royal Bet ou de seus
                    licenciadores e está protegido por leis de direitos autorais e propriedade intelectual.
                  </p>
                  <p>
                    É proibido reproduzir, distribuir, modificar ou criar trabalhos derivados de qualquer conteúdo do Site sem autorização expressa por escrito.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">LEI APLICÁVEL E JURISDIÇÃO</h2>
                <div className="space-y-4">
                  <p>
                    Estes Termos são regidos pelas leis da República Federativa do Brasil. Quaisquer disputas decorrentes destes Termos serão submetidas à jurisdição
                    exclusiva dos tribunais brasileiros.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">CONTATO</h2>
                <div className="space-y-4">
                  <p>
                    Se você tiver dúvidas ou preocupações sobre estes Termos, entre em contato conosco através dos seguintes canais:
                  </p>
                  <p className="pl-4">
                    • E-mail: suporte@venuzbet.com
                  </p>
                  <p className="pl-4">
                    • Chat ao vivo: Disponível 24/7 em nossa plataforma
                  </p>
                  <p className="pl-4">
                    • Telegram: @venuzbet
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
