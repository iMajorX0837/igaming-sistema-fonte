import type { CopyByLanguage } from '../types';
import type { LegalDocument } from './types';

export const BETTING_TERMS_CONTENT: CopyByLanguage<LegalDocument> = {
  pt: {
    lastUpdated: 'Última atualização: 17 de abril de 2025',
    sections: [
      {
        title: 'VISÃO GERAL',
        paragraphs: [
          {
            text: 'Os Termos de Apostas estabelecem as regras e condições específicas para todas as atividades de apostas esportivas realizadas na plataforma {nomeBet}. Estes termos complementam e se integram aos Termos e Condições gerais da plataforma.',
          },
          {
            text: 'Ao participar de apostas esportivas em nossa plataforma, você confirma que leu, compreendeu e concorda integralmente com estes termos.',
          },
        ],
      },
      {
        title: 'TIPOS DE APOSTAS',
        paragraphs: [
          { text: 'Nossa plataforma oferece diversos tipos de apostas, incluindo mas não limitado a:' },
          { text: '• Apostas Simples: Aposta em um único resultado', indent: true },
          { text: '• Apostas Combinadas: Combinação de dois ou mais eventos', indent: true },
          { text: '• Apostas Ao Vivo: Apostas em eventos em andamento', indent: true },
          { text: '• Apostas Especiais: Eventos específicos dentro de um jogo ou competição', indent: true },
          {
            text: 'Cada tipo de aposta possui suas próprias regras e cotações específicas, que são exibidas na interface de apostas.',
          },
        ],
      },
      {
        title: 'ACEITAÇÃO DE APOSTAS',
        paragraphs: [
          {
            text: 'Reservamo-nos o direito de aceitar ou recusar qualquer aposta. Uma aposta será considerada aceita quando for confirmada pela plataforma e o saldo da sua conta for debitado.',
          },
          {
            text: 'Em caso de qualquer erro de exibição de cotações ou erros técnicos que resultem em cotações anormalmente altas ou baixas, a aposta pode ser anulada ou ajustada, e você será notificado imediatamente.',
          },
          {
            text: 'Apostas podem ser canceladas antes da confirmação final, desde que o evento ainda não tenha iniciado.',
          },
        ],
      },
      {
        title: 'RESOLUÇÃO DE APOSTAS',
        paragraphs: [
          {
            text: 'As apostas serão resolvidas de acordo com o resultado oficial do evento, conforme determinado pelas autoridades competentes ou organismos reguladores das respectivas competições.',
          },
          {
            text: 'Os resultados são atualizados na plataforma assim que forem confirmados oficialmente. Em caso de inconsistências entre diferentes fontes, a decisão final da {nomeBet} será baseada na informação oficial da entidade reguladora.',
          },
          {
            text: 'Apostas vencedoras são creditadas automaticamente em sua conta. Apostas perdidas têm seus valores retirados imediatamente após a confirmação do resultado.',
          },
        ],
      },
      {
        title: 'EVENTOS ADIADOS OU CANCELADOS',
        paragraphs: [
          {
            text: 'Se um evento for adiado e for realizado dentro de 48 horas, a aposta permanece válida com as mesmas condições.',
          },
          {
            text: 'Se um evento for adiado por mais de 48 horas ou for cancelado, as apostas serão anuladas e os valores reembolsados ao cliente.',
          },
          {
            text: 'Em caso de suspensão temporária de um evento em andamento (por exemplo, interrupção de jogo), as apostas para aquele evento específico podem ser suspensas. Uma vez retomado, as apostas serão reativadas conforme o novo status do evento.',
          },
        ],
      },
      {
        title: 'APOSTAS COMBINADAS',
        paragraphs: [
          {
            text: 'Em apostas combinadas, todos os eventos selecionados devem ter resultado para que a aposta seja ganha. Se um evento resultar em empate ou não se realizar, a aposta é perdida.',
          },
          {
            text: 'Os ganhos são calculados multiplicando as cotações de todos os eventos selecionados. Qualquer erro na cotação de um dos eventos pode resultar na anulação ou ajuste da aposta.',
          },
        ],
      },
      {
        title: 'APOSTAS AO VIVO',
        paragraphs: [
          {
            text: 'As apostas ao vivo são aceitas apenas enquanto o evento está em andamento. As cotações mudam em tempo real e refletem as condições atuais do evento.',
          },
          {
            text: 'Atrasos de transmissão podem resultar em diferenças entre o que você vê na tela e o que realmente está acontecendo. A plataforma não é responsável por estes atrasos.',
          },
          { text: 'Apostas ao vivo são irreversíveis uma vez aceitas pela plataforma.' },
        ],
      },
      {
        title: 'COTAÇÕES E ODDS',
        paragraphs: [
          {
            text: 'As cotações exibidas na plataforma podem estar sujeitas a mudanças. A cotação que importa é aquela que você vê no momento em que confirma sua aposta.',
          },
          {
            text: 'Em caso de erro óbvio na exibição de uma cotação (como uma cotação anormalmente alta ou baixa), podemos anular ou ajustar a aposta sem aviso prévio.',
          },
        ],
      },
      {
        title: 'LIMITE DE APOSTAS',
        paragraphs: [
          {
            text: 'Reservamo-nos o direito de estabelecer limites mínimos e máximos para apostas, que podem variar dependendo do evento, tipo de aposta e outras circunstâncias.',
          },
          {
            text: 'Estes limites são exibidos na interface de apostas. Podemos modificar estes limites a qualquer momento sem aviso prévio.',
          },
        ],
      },
      {
        title: 'FRAUDE E ABUSO',
        paragraphs: [
          {
            text: 'Qualquer tentativa de fraude, incluindo mas não limitado a colusão com outras pessoas, exploração de erros do sistema, ou manipulação de eventos, resultará no encerramento imediato da conta e confisco de quaisquer ganhos.',
          },
          { text: 'Cooperaremos com as autoridades investigando suspeitas de atividades ilícitas.' },
        ],
      },
    ],
  },
  en: {
    lastUpdated: 'Last updated: April 17, 2025',
    sections: [
      {
        title: 'OVERVIEW',
        paragraphs: [
          {
            text: 'These Betting Terms set out the specific rules and conditions for all sports betting activities conducted on the {nomeBet} platform. These terms supplement and integrate with the platform\'s general Terms and Conditions.',
          },
          {
            text: 'By participating in sports betting on our platform, you confirm that you have read, understood, and fully agree to these terms.',
          },
        ],
      },
      {
        title: 'BET TYPES',
        paragraphs: [
          { text: 'Our platform offers various types of bets, including but not limited to:' },
          { text: '• Single Bets: A bet on a single outcome', indent: true },
          { text: '• Accumulator Bets: A combination of two or more events', indent: true },
          { text: '• Live Bets: Bets on events in progress', indent: true },
          { text: '• Special Bets: Specific events within a game or competition', indent: true },
          {
            text: 'Each bet type has its own specific rules and odds, which are displayed in the betting interface.',
          },
        ],
      },
      {
        title: 'BET ACCEPTANCE',
        paragraphs: [
          {
            text: 'We reserve the right to accept or reject any bet. A bet is considered accepted when it is confirmed by the platform and your account balance is debited.',
          },
          {
            text: 'In the event of any odds display error or technical errors resulting in abnormally high or low odds, the bet may be voided or adjusted, and you will be notified immediately.',
          },
          {
            text: 'Bets may be cancelled before final confirmation, provided the event has not yet started.',
          },
        ],
      },
      {
        title: 'BET SETTLEMENT',
        paragraphs: [
          {
            text: 'Bets will be settled according to the official result of the event, as determined by the competent authorities or governing bodies of the respective competitions.',
          },
          {
            text: 'Results are updated on the platform as soon as they are officially confirmed. In case of inconsistencies between different sources, the final decision of {nomeBet} will be based on the official information from the governing body.',
          },
          {
            text: 'Winning bets are credited automatically to your account. Losing bets have their amounts deducted immediately after the result is confirmed.',
          },
        ],
      },
      {
        title: 'POSTPONED OR CANCELLED EVENTS',
        paragraphs: [
          {
            text: 'If an event is postponed and takes place within 48 hours, the bet remains valid under the same conditions.',
          },
          {
            text: 'If an event is postponed for more than 48 hours or is cancelled, bets will be voided and amounts refunded to the customer.',
          },
          {
            text: 'In the event of a temporary suspension of an ongoing event (for example, a game interruption), bets on that specific event may be suspended. Once resumed, bets will be reactivated according to the new status of the event.',
          },
        ],
      },
      {
        title: 'ACCUMULATOR BETS',
        paragraphs: [
          {
            text: 'In accumulator bets, all selected events must produce a result for the bet to win. If an event results in a push or does not take place, the bet is lost.',
          },
          {
            text: 'Winnings are calculated by multiplying the odds of all selected events. Any error in the odds of one of the events may result in voiding or adjusting the bet.',
          },
        ],
      },
      {
        title: 'LIVE BETTING',
        paragraphs: [
          {
            text: 'Live bets are accepted only while the event is in progress. Odds change in real time and reflect the current conditions of the event.',
          },
          {
            text: 'Broadcast delays may result in differences between what you see on screen and what is actually happening. The platform is not responsible for these delays.',
          },
          { text: 'Live bets are irreversible once accepted by the platform.' },
        ],
      },
      {
        title: 'ODDS',
        paragraphs: [
          {
            text: 'Odds displayed on the platform may be subject to change. The odds that matter are those you see at the moment you confirm your bet.',
          },
          {
            text: 'In the event of an obvious error in the display of odds (such as abnormally high or low odds), we may void or adjust the bet without prior notice.',
          },
        ],
      },
      {
        title: 'BETTING LIMITS',
        paragraphs: [
          {
            text: 'We reserve the right to set minimum and maximum betting limits, which may vary depending on the event, bet type, and other circumstances.',
          },
          {
            text: 'These limits are displayed in the betting interface. We may modify these limits at any time without prior notice.',
          },
        ],
      },
      {
        title: 'FRAUD AND ABUSE',
        paragraphs: [
          {
            text: 'Any attempt at fraud, including but not limited to collusion with others, exploitation of system errors, or event manipulation, will result in immediate account closure and forfeiture of any winnings.',
          },
          { text: 'We will cooperate with authorities investigating suspected illicit activities.' },
        ],
      },
    ],
  },
  es: {
    lastUpdated: 'Última actualización: 17 de abril de 2025',
    sections: [
      {
        title: 'VISIÓN GENERAL',
        paragraphs: [
          {
            text: 'Los Términos de Apuestas establecen las reglas y condiciones específicas para todas las actividades de apuestas deportivas realizadas en la plataforma {nomeBet}. Estos términos complementan e integran los Términos y Condiciones generales de la plataforma.',
          },
          {
            text: 'Al participar en apuestas deportivas en nuestra plataforma, usted confirma que ha leído, comprendido y acepta íntegramente estos términos.',
          },
        ],
      },
      {
        title: 'TIPOS DE APUESTAS',
        paragraphs: [
          { text: 'Nuestra plataforma ofrece diversos tipos de apuestas, incluyendo pero no limitado a:' },
          { text: '• Apuestas Simples: Apuesta en un único resultado', indent: true },
          { text: '• Apuestas Combinadas: Combinación de dos o más eventos', indent: true },
          { text: '• Apuestas en Vivo: Apuestas en eventos en curso', indent: true },
          { text: '• Apuestas Especiales: Eventos específicos dentro de un juego o competición', indent: true },
          {
            text: 'Cada tipo de apuesta tiene sus propias reglas y cuotas específicas, que se muestran en la interfaz de apuestas.',
          },
        ],
      },
      {
        title: 'ACEPTACIÓN DE APUESTAS',
        paragraphs: [
          {
            text: 'Nos reservamos el derecho de aceptar o rechazar cualquier apuesta. Una apuesta se considerará aceptada cuando sea confirmada por la plataforma y se debite el saldo de su cuenta.',
          },
          {
            text: 'En caso de cualquier error en la visualización de cuotas o errores técnicos que resulten en cuotas anormalmente altas o bajas, la apuesta puede anularse o ajustarse, y se le notificará inmediatamente.',
          },
          {
            text: 'Las apuestas pueden cancelarse antes de la confirmación final, siempre que el evento aún no haya comenzado.',
          },
        ],
      },
      {
        title: 'LIQUIDACIÓN DE APUESTAS',
        paragraphs: [
          {
            text: 'Las apuestas se liquidarán de acuerdo con el resultado oficial del evento, según lo determine las autoridades competentes u organismos reguladores de las respectivas competiciones.',
          },
          {
            text: 'Los resultados se actualizan en la plataforma tan pronto como se confirman oficialmente. En caso de inconsistencias entre diferentes fuentes, la decisión final de {nomeBet} se basará en la información oficial de la entidad reguladora.',
          },
          {
            text: 'Las apuestas ganadoras se acreditan automáticamente en su cuenta. Las apuestas perdedoras tienen sus montos retirados inmediatamente después de la confirmación del resultado.',
          },
        ],
      },
      {
        title: 'EVENTOS POSPUESTOS O CANCELADOS',
        paragraphs: [
          {
            text: 'Si un evento se pospone y se realiza dentro de las 48 horas, la apuesta permanece válida con las mismas condiciones.',
          },
          {
            text: 'Si un evento se pospone por más de 48 horas o se cancela, las apuestas se anularán y los montos se reembolsarán al cliente.',
          },
          {
            text: 'En caso de suspensión temporal de un evento en curso (por ejemplo, interrupción del juego), las apuestas para ese evento específico pueden suspenderse. Una vez reanudado, las apuestas se reactivarán según el nuevo estado del evento.',
          },
        ],
      },
      {
        title: 'APUESTAS COMBINADAS',
        paragraphs: [
          {
            text: 'En apuestas combinadas, todos los eventos seleccionados deben tener resultado para que la apuesta sea ganadora. Si un evento resulta en empate o no se realiza, la apuesta se pierde.',
          },
          {
            text: 'Las ganancias se calculan multiplicando las cuotas de todos los eventos seleccionados. Cualquier error en la cuota de uno de los eventos puede resultar en la anulación o ajuste de la apuesta.',
          },
        ],
      },
      {
        title: 'APUESTAS EN VIVO',
        paragraphs: [
          {
            text: 'Las apuestas en vivo se aceptan solo mientras el evento está en curso. Las cuotas cambian en tiempo real y reflejan las condiciones actuales del evento.',
          },
          {
            text: 'Los retrasos en la transmisión pueden resultar en diferencias entre lo que ve en pantalla y lo que realmente está sucediendo. La plataforma no es responsable de estos retrasos.',
          },
          { text: 'Las apuestas en vivo son irreversibles una vez aceptadas por la plataforma.' },
        ],
      },
      {
        title: 'CUOTAS Y ODDS',
        paragraphs: [
          {
            text: 'Las cuotas mostradas en la plataforma pueden estar sujetas a cambios. La cuota que importa es la que ve en el momento en que confirma su apuesta.',
          },
          {
            text: 'En caso de error obvio en la visualización de una cuota (como una cuota anormalmente alta o baja), podemos anular o ajustar la apuesta sin previo aviso.',
          },
        ],
      },
      {
        title: 'LÍMITES DE APUESTAS',
        paragraphs: [
          {
            text: 'Nos reservamos el derecho de establecer límites mínimos y máximos para apuestas, que pueden variar según el evento, tipo de apuesta y otras circunstancias.',
          },
          {
            text: 'Estos límites se muestran en la interfaz de apuestas. Podemos modificar estos límites en cualquier momento sin previo aviso.',
          },
        ],
      },
      {
        title: 'FRAUDE Y ABUSO',
        paragraphs: [
          {
            text: 'Cualquier intento de fraude, incluyendo pero no limitado a colusión con otras personas, explotación de errores del sistema o manipulación de eventos, resultará en el cierre inmediato de la cuenta y la confiscación de cualquier ganancia.',
          },
          { text: 'Cooperaremos con las autoridades que investiguen sospechas de actividades ilícitas.' },
        ],
      },
    ],
  },
};
