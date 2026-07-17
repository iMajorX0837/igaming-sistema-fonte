import { FileText, Calendar } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';
import { useSiteBrand } from '../hooks/useSiteBrand';

interface AMLPolicyPageProps {
  onBack: () => void;
}

export default function AMLPolicyPage({ onBack }: AMLPolicyPageProps) {
  const { nomeBet } = useSiteBrand();

  return (
    <AppPageScaffold>
          <div className="max-w-5xl mx-auto px-6 py-8">
            <BackButton onClick={onBack} className="mb-6" />

            <h1 className="text-white text-3xl font-bold mb-6">Política AML</h1>

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
                <h2 className="text-white text-xl font-bold mb-4">VISÃO GERAL AML</h2>
                <div className="space-y-4">
                  <p>
                    O {nomeBet} está comprometido em cumprir todas as leis e regulamentações de Prevenção à Lavagem de Dinheiro (Anti-Money Laundering - AML) e de
                    Combate ao Financiamento do Terrorismo (CFT) aplicáveis.
                  </p>
                  <p>
                    Esta Política AML descreve os procedimentos implementados para prevenir atividades ilícitas e garantir a conformidade com as exigências
                    regulatórias.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">CONFORMIDADE REGULATÓRIA</h2>
                <div className="space-y-4">
                  <p>
                    O {nomeBet} está em conformidade com:
                  </p>
                  <p className="pl-4">
                    • Lei nº 9.613/1998 (Lei de Lavagem de Dinheiro do Brasil)
                  </p>
                  <p className="pl-4">
                    • Resolução 4.658/2017 do Banco Central do Brasil
                  </p>
                  <p className="pl-4">
                    • Regulamentações da Secretaria de Prêmios e Apostas do Ministério da Fazenda
                  </p>
                  <p className="pl-4">
                    • FATF (Financial Action Task Force) Recomendações internacionais
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">PROGRAMAS DE COMPLIANCE</h2>
                <div className="space-y-4">
                  <p className="font-semibold text-white">Know Your Customer (KYC)</p>
                  <p>
                    Realizamos verificação rigorosa de identidade de todos os clientes conforme descrito em nossa Política KYC. Isso inclui coleta de informações
                    pessoais, verificação de documentos e análise de elegibilidade.
                  </p>

                  <p className="font-semibold text-white mt-6">Due Diligence Contínua</p>
                  <p>
                    Monitoramos continuamente as contas de clientes para detectar atividades suspeitas. Padrões de transações são analisados para identificar possíveis
                    atividades ilícitas.
                  </p>

                  <p className="font-semibold text-white mt-6">Screening de Sanções</p>
                  <p>
                    Verificamos todos os clientes contra listas de sanções internacionais, incluindo OFAC (Office of Foreign Assets Control) e outras listas de PEP
                    (Politically Exposed Persons).
                  </p>

                  <p className="font-semibold text-white mt-6">Relatório de Atividades Suspeitas</p>
                  <p>
                    Relatamos atividades suspeitas às autoridades competentes, incluindo o Coaf (Conselho de Controle de Atividades Financeiras) conforme obrigado por
                    lei.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">INDICADORES DE ATIVIDADE SUSPEITA</h2>
                <div className="space-y-4">
                  <p>
                    Atividades que podem ser investigadas incluem:
                  </p>
                  <p className="pl-4">
                    • Depósitos frequentes seguidos imediatamente por saques
                  </p>
                  <p className="pl-4">
                    • Padrões de transações anormais ou inconsistentes com perfil de cliente
                  </p>
                  <p className="pl-4">
                    • Transações com jurisdições de alto risco
                  </p>
                  <p className="pl-4">
                    • Múltiplas contas com dados similares
                  </p>
                  <p className="pl-4">
                    • Recusa em fornecer informações requeridas
                  </p>
                  <p className="pl-4">
                    • Documentação fraudulenta ou inconsistências nas informações
                  </p>
                  <p className="pl-4">
                    • Transações sem finalidade aparente de jogo
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">LIMITES DE TRANSAÇÃO</h2>
                <div className="space-y-4">
                  <p>
                    Implementamos limites de transação para monitorar e prevenir lavagem de dinheiro:
                  </p>
                  <p className="pl-4">
                    • Limite de depósito diário por cliente
                  </p>
                  <p className="pl-4">
                    • Limite de saque diário por cliente
                  </p>
                  <p className="pl-4">
                    • Limite de transação acumulativa por período
                  </p>
                  <p>
                    Limites podem ser ajustados com base na análise de risco de cada cliente.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">ORIGEM DE FUNDOS</h2>
                <div className="space-y-4">
                  <p>
                    Todos os depósitos devem ter origem lícita. Você é responsável por confirmar que:
                  </p>
                  <p className="pl-4">
                    • Os fundos pertencem a você ou a alguém autorizado a depositá-los
                  </p>
                  <p className="pl-4">
                    • Os fundos não são provenientes de atividades ilícitas
                  </p>
                  <p className="pl-4">
                    • Você pode explicar a origem dos fundos se solicitado
                  </p>
                  <p>
                    Depósitos de origem suspeita serão bloqueados e você pode estar sujeito a relatório às autoridades.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">INVESTIGAÇÕES INTERNAS</h2>
                <div className="space-y-4">
                  <p>
                    Se detectarmos atividades suspeitas:
                  </p>
                  <p className="pl-4">
                    • Sua conta pode ser suspensa temporariamente
                  </p>
                  <p className="pl-4">
                    • Transações podem ser bloqueadas
                  </p>
                  <p className="pl-4">
                    • Podemos solicitar informações adicionais
                  </p>
                  <p className="pl-4">
                    • A conta pode ser encerrada permanentemente
                  </p>
                  <p className="pl-4">
                    • Ganhos podem ser confiscados
                  </p>
                  <p>
                    Você será notificado se apropriado conforme permitido por lei.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">TERCEIRIZAÇÃO E PARCEIROS</h2>
                <div className="space-y-4">
                  <p>
                    Todos os fornecedores de serviços e parceiros terceirizados são selecionados com base em seus controles de conformidade AML. Garantimos que cumprem
                    com os mesmos padrões de AML que mantemos.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">POLÍTICAS DE REEMBOLSO</h2>
                <div className="space-y-4">
                  <p>
                    Reembolsos são processados de volta para o método de pagamento original. Não permitimos redirecionamento de fundos para terceiros, o que ajuda a
                    prevenir lavagem de dinheiro.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">TREINAMENTO E CONSCIENTIZAÇÃO</h2>
                <div className="space-y-4">
                  <p>
                    Nossa equipe recebe treinamento regular em conformidade AML para garantir que os procedimentos sejam implementados efetivamente e para manter
                    conscientização sobre novos riscos e técnicas de lavagem de dinheiro.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">RELATÓRIOS À COAF</h2>
                <div className="space-y-4">
                  <p>
                    Somos obrigados a relatar atividades suspeitas ao COAF (Conselho de Controle de Atividades Financeiras) do Brasil. Estes relatórios são
                    confidenciais e protegidos por lei.
                  </p>
                  <p>
                    Você não será notificado de relatórios ao COAF conforme exigido por lei para manter a efetividade investigativa.
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
