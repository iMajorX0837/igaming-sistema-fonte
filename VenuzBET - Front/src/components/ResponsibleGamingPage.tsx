import { FileText, Calendar } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';
import { useSiteBrand } from '../hooks/useSiteBrand';

interface ResponsibleGamingPageProps {
  onBack: () => void;
}

export default function ResponsibleGamingPage({ onBack }: ResponsibleGamingPageProps) {
  const { nomeBet } = useSiteBrand();

  return (
    <AppPageScaffold>
          <div className="max-w-5xl mx-auto px-6 py-8">
            <BackButton onClick={onBack} className="mb-6" />

            <h1 className="text-white text-3xl font-bold mb-6">Política de Jogo Responsável</h1>

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
                <h2 className="text-white text-xl font-bold mb-4">COMPROMISSO COM JOGO RESPONSÁVEL</h2>
                <div className="space-y-4">
                  <p>
                    O {nomeBet} está profundamente comprometido com a promoção de jogo responsável e seguro. Reconhecemos que o jogo pode ser prejudicial se não for
                    praticado de forma responsável e estamos dedicados a fornecer ferramentas e recursos para ajudar nossos clientes a jogar de forma segura.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">DEFINIÇÃO DE JOGO RESPONSÁVEL</h2>
                <div className="space-y-4">
                  <p>
                    Jogo responsável significa jogar de forma equilibrada, reconhecendo que o jogo é uma forma de entretenimento e não uma fonte de renda. Inclui:
                  </p>
                  <p className="pl-4">
                    • Jogar apenas com dinheiro que pode permitir-se perder
                  </p>
                  <p className="pl-4">
                    • Manter o jogo como forma de entretenimento, não de fuga
                  </p>
                  <p className="pl-4">
                    • Respeitar limites estabelecidos
                  </p>
                  <p className="pl-4">
                    • Procurar ajuda se suspeitar de problemas de jogo
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">FERRAMENTAS DE CONTROLE</h2>
                <div className="space-y-4">
                  <p className="font-semibold text-white">Limites de Depósito</p>
                  <p>
                    Você pode estabelecer limites diários, semanais ou mensais para a quantidade que deseja depositar. Uma vez estabelecido, você não poderá depositar
                    acima do limite até o período expirar.
                  </p>

                  <p className="font-semibold text-white mt-6">Limites de Apostas</p>
                  <p>
                    Você pode limitar o valor máximo que pode apostar por jogo ou evento.
                  </p>

                  <p className="font-semibold text-white mt-6">Tempo de Uso</p>
                  <p>
                    Você pode estabelecer limites de tempo que o alertarão quando estiver se aproximando de seu tempo de sessão máximo.
                  </p>

                  <p className="font-semibold text-white mt-6">Autoexclusão Temporária</p>
                  <p>
                    Você pode solicitar uma pausa no jogo por um período especificado (mínimo de 1 dia a máximo de 1 ano) durante o qual sua conta será suspensa e você
                    não poderá fazer login ou acessar seus fundos.
                  </p>

                  <p className="font-semibold text-white mt-6">Autoexclusão Permanente</p>
                  <p>
                    Se desejar, você pode solicitar o encerramento permanente de sua conta, após o qual seus fundos serão devolvidos e você não poderá reabrir a conta.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">SINAIS DE ALERTA</h2>
                <div className="space-y-4">
                  <p>
                    Procure ajuda se você apresentar qualquer um destes sinais:
                  </p>
                  <p className="pl-4">
                    • Passa mais tempo jogando do que pretendia
                  </p>
                  <p className="pl-4">
                    • Aumenta constantemente as apostas para obter a mesma emoção
                  </p>
                  <p className="pl-4">
                    • Mente para familiares ou amigos sobre o quanto joga
                  </p>
                  <p className="pl-4">
                    • Usa o jogo para escapar de problemas
                  </p>
                  <p className="pl-4">
                    • Gasta mais dinheiro do que pode permitir
                  </p>
                  <p className="pl-4">
                    • Pede emprestado para jogar
                  </p>
                  <p className="pl-4">
                    • Afeta seus relacionamentos ou trabalho
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">RECURSOS DE AJUDA</h2>
                <div className="space-y-4">
                  <p>
                    Se você está lutando com o jogo, existem recursos disponíveis para ajudá-lo:
                  </p>
                  <p className="font-semibold text-white mt-6">No Brasil:</p>
                  <p className="pl-4">
                    • Central de Jogo Responsável: Disponível em nossa plataforma
                  </p>
                  <p className="pl-4">
                    • Secretaria de Prêmios e Apostas do Ministério da Fazenda
                  </p>
                  <p className="pl-4">
                    • Associação Nacional do Jogo Responsável (ANJR)
                  </p>

                  <p className="font-semibold text-white mt-6">Internacionalmente:</p>
                  <p className="pl-4">
                    • Gamblers Anonymous: www.gamblersanonymous.org
                  </p>
                  <p className="pl-4">
                    • National Council on Problem Gambling: www.ncpg.org
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">NÃO PERMITIMOS</h2>
                <div className="space-y-4">
                  <p>
                    Não permitimos o jogo de:
                  </p>
                  <p className="pl-4">
                    • Menores de 18 anos (qualquer acesso de menores resultará em encerramento de conta e confisco de fundos)
                  </p>
                  <p className="pl-4">
                    • Pessoas em autoexclusão em outras plataformas (cumprimento de registros de autoexclusão nacionais)
                  </p>
                  <p className="pl-4">
                    • Pessoas sob ordem de afastamento do jogo por decisão judicial
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">SUPORTE FINANCEIRO</h2>
                <div className="space-y-4">
                  <p>
                    Oferecemos ferramentas de gerenciamento financeiro:
                  </p>
                  <p className="pl-4">
                    • Histórico de transações completo e transparente
                  </p>
                  <p className="pl-4">
                    • Relatórios de gastos mensais
                  </p>
                  <p className="pl-4">
                    • Notificações de grandes perdas
                  </p>
                  <p className="pl-4">
                    • Possibilidade de solicitar devoluções de depósitos em certos casos
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">EDUCAÇÃO E INFORMAÇÃO</h2>
                <div className="space-y-4">
                  <p>
                    Fornecemos informações educacionais sobre:
                  </p>
                  <p className="pl-4">
                    • Probabilidades e odds das apostas
                  </p>
                  <p className="pl-4">
                    • Riscos associados ao jogo
                  </p>
                  <p className="pl-4">
                    • Sinais de comportamento problemático
                  </p>
                  <p className="pl-4">
                    • Recursos de ajuda disponíveis
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">CONFORMIDADE</h2>
                <div className="space-y-4">
                  <p>
                    O {nomeBet} está em conformidade com todas as regulamentações de jogo responsável estabelecidas pelas autoridades regulatórias brasileiras e é
                    membro de associações de jogo responsável.
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
