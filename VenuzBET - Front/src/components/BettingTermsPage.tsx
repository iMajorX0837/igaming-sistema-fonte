import { FileText, Calendar } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';

interface BettingTermsPageProps {
  onBack: () => void;
}

export default function BettingTermsPage({ onBack }: BettingTermsPageProps) {

  return (
    <AppPageScaffold>
          <div className="max-w-5xl mx-auto px-6 py-8">
            <BackButton onClick={onBack} className="mb-6" />

            <h1 className="text-white text-3xl font-bold mb-6">Termos de Apostas</h1>

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
                <h2 className="text-white text-xl font-bold mb-4">VISÃO GERAL</h2>
                <div className="space-y-4">
                  <p>
                    Os Termos de Apostas estabelecem as regras e condições específicas para todas as atividades de apostas esportivas realizadas na plataforma Royal Bet.
                    Estes termos complementam e se integram aos Termos e Condições gerais da plataforma.
                  </p>
                  <p>
                    Ao participar de apostas esportivas em nossa plataforma, você confirma que leu, compreendeu e concorda integralmente com estes termos.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">TIPOS DE APOSTAS</h2>
                <div className="space-y-4">
                  <p>
                    Nossa plataforma oferece diversos tipos de apostas, incluindo mas não limitado a:
                  </p>
                  <p className="pl-4">
                    • Apostas Simples: Aposta em um único resultado
                  </p>
                  <p className="pl-4">
                    • Apostas Combinadas: Combinação de dois ou mais eventos
                  </p>
                  <p className="pl-4">
                    • Apostas Ao Vivo: Apostas em eventos em andamento
                  </p>
                  <p className="pl-4">
                    • Apostas Especiais: Eventos específicos dentro de um jogo ou competição
                  </p>
                  <p>
                    Cada tipo de aposta possui suas próprias regras e cotações específicas, que são exibidas na interface de apostas.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">ACEITAÇÃO DE APOSTAS</h2>
                <div className="space-y-4">
                  <p>
                    Reservamo-nos o direito de aceitar ou recusar qualquer aposta. Uma aposta será considerada aceita quando for confirmada pela plataforma e o saldo da
                    sua conta for debitado.
                  </p>
                  <p>
                    Em caso de qualquer erro de exibição de cotações ou erros técnicos que resultem em cotações anormalmente altas ou baixas, a aposta pode ser anulada
                    ou ajustada, e você será notificado imediatamente.
                  </p>
                  <p>
                    Apostas podem ser canceladas antes da confirmação final, desde que o evento ainda não tenha iniciado.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">RESOLUÇÃO DE APOSTAS</h2>
                <div className="space-y-4">
                  <p>
                    As apostas serão resolvidas de acordo com o resultado oficial do evento, conforme determinado pelas autoridades competentes ou organismos
                    reguladores das respectivas competições.
                  </p>
                  <p>
                    Os resultados são atualizados na plataforma assim que forem confirmados oficialmente. Em caso de inconsistências entre diferentes fontes, a decisão
                    final da Royal Bet será baseada na informação oficial da entidade reguladora.
                  </p>
                  <p>
                    Apostas vencedoras são creditadas automaticamente em sua conta. Apostas perdidas têm seus valores retirados imediatamente após a confirmação do
                    resultado.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">EVENTOS ADIADOS OU CANCELADOS</h2>
                <div className="space-y-4">
                  <p>
                    Se um evento for adiado e for realizado dentro de 48 horas, a aposta permanece válida com as mesmas condições.
                  </p>
                  <p>
                    Se um evento for adiado por mais de 48 horas ou for cancelado, as apostas serão anuladas e os valores reembolsados ao cliente.
                  </p>
                  <p>
                    Em caso de suspensão temporária de um evento em andamento (por exemplo, interrupção de jogo), as apostas para aquele evento específico podem ser
                    suspensas. Uma vez retomado, as apostas serão reativadas conforme o novo status do evento.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">APOSTAS COMBINADAS</h2>
                <div className="space-y-4">
                  <p>
                    Em apostas combinadas, todos os eventos selecionados devem ter resultado para que a aposta seja ganha. Se um evento resultar em empate ou não se
                    realizar, a aposta é perdida.
                  </p>
                  <p>
                    Os ganhos são calculados multiplicando as cotações de todos os eventos selecionados. Qualquer erro na cotação de um dos eventos pode resultar na
                    anulação ou ajuste da aposta.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">APOSTAS AO VIVO</h2>
                <div className="space-y-4">
                  <p>
                    As apostas ao vivo são aceitas apenas enquanto o evento está em andamento. As cotações mudam em tempo real e refletem as condições atuais do evento.
                  </p>
                  <p>
                    Atrasos de transmissão podem resultar em diferenças entre o que você vê na tela e o que realmente está acontecendo. A plataforma não é
                    responsável por estes atrasos.
                  </p>
                  <p>
                    Apostas ao vivo são irreversíveis uma vez aceitas pela plataforma.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">COTAÇÕES E ODDS</h2>
                <div className="space-y-4">
                  <p>
                    As cotações exibidas na plataforma podem estar sujeitas a mudanças. A cotação que importa é aquela que você vê no momento em que confirma sua aposta.
                  </p>
                  <p>
                    Em caso de erro óbvio na exibição de uma cotação (como uma cotação anormalmente alta ou baixa), podemos anular ou ajustar a aposta sem aviso prévio.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">LIMITE DE APOSTAS</h2>
                <div className="space-y-4">
                  <p>
                    Reservamo-nos o direito de estabelecer limites mínimos e máximos para apostas, que podem variar dependendo do evento, tipo de aposta e outras
                    circunstâncias.
                  </p>
                  <p>
                    Estes limites são exibidos na interface de apostas. Podemos modificar estes limites a qualquer momento sem aviso prévio.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">FRAUDE E ABUSO</h2>
                <div className="space-y-4">
                  <p>
                    Qualquer tentativa de fraude, incluindo mas não limitado a colusão com outras pessoas, exploração de erros do sistema, ou manipulação de eventos,
                    resultará no encerramento imediato da conta e confisco de quaisquer ganhos.
                  </p>
                  <p>
                    Cooperaremos com as autoridades investigando suspeitas de atividades ilícitas.
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
