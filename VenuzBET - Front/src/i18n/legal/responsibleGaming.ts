import type { CopyByLanguage } from '../types';
import type { LegalDocument } from './types';

export const RESPONSIBLE_GAMING_CONTENT: CopyByLanguage<LegalDocument> = {
  pt: {
    lastUpdated: 'Última atualização: 17 de abril de 2025',
    sections: [
      { title: 'COMPROMISSO COM JOGO RESPONSÁVEL', paragraphs: [{ text: 'O {nomeBet} está profundamente comprometido com a promoção de jogo responsável e seguro. Reconhecemos que o jogo pode ser prejudicial se não for praticado de forma responsável e estamos dedicados a fornecer ferramentas e recursos para ajudar nossos clientes a jogar de forma segura.' }] },
      { title: 'DEFINIÇÃO DE JOGO RESPONSÁVEL', paragraphs: [{ text: 'Jogo responsável significa jogar de forma equilibrada, reconhecendo que o jogo é uma forma de entretenimento e não uma fonte de renda. Inclui:' }, { text: '• Jogar apenas com dinheiro que pode permitir-se perder', indent: true }, { text: '• Manter o jogo como forma de entretenimento, não de fuga', indent: true }, { text: '• Respeitar limites estabelecidos', indent: true }, { text: '• Procurar ajuda se suspeitar de problemas de jogo', indent: true }] },
      { title: 'FERRAMENTAS DE CONTROLE', paragraphs: [
        { text: 'Limites de Depósito' }, { text: 'Você pode estabelecer limites diários, semanais ou mensais para a quantidade que deseja depositar. Uma vez estabelecido, você não poderá depositar acima do limite até o período expirar.' },
        { text: 'Limites de Apostas' }, { text: 'Você pode limitar o valor máximo que pode apostar por jogo ou evento.' },
        { text: 'Tempo de Uso' }, { text: 'Você pode estabelecer limites de tempo que o alertarão quando estiver se aproximando de seu tempo de sessão máximo.' },
        { text: 'Autoexclusão Temporária' }, { text: 'Você pode solicitar uma pausa no jogo por um período especificado (mínimo de 1 dia a máximo de 1 ano) durante o qual sua conta será suspensa e você não poderá fazer login ou acessar seus fundos.' },
        { text: 'Autoexclusão Permanente' }, { text: 'Se desejar, você pode solicitar o encerramento permanente de sua conta, após o qual seus fundos serão devolvidos e você não poderá reabrir a conta.' },
      ] },
      { title: 'SINAIS DE ALERTA', paragraphs: [{ text: 'Procure ajuda se você apresentar qualquer um destes sinais:' }, { text: '• Passa mais tempo jogando do que pretendia', indent: true }, { text: '• Aumenta constantemente as apostas para obter a mesma emoção', indent: true }, { text: '• Mente para familiares ou amigos sobre o quanto joga', indent: true }, { text: '• Usa o jogo para escapar de problemas', indent: true }, { text: '• Gasta mais dinheiro do que pode permitir', indent: true }, { text: '• Pede emprestado para jogar', indent: true }, { text: '• Afeta seus relacionamentos ou trabalho', indent: true }] },
      { title: 'RECURSOS DE AJUDA', paragraphs: [
        { text: 'Se você está lutando com o jogo, existem recursos disponíveis para ajudá-lo:' }, { text: 'No Brasil:' }, { text: '• Central de Jogo Responsável: Disponível em nossa plataforma', indent: true }, { text: '• Secretaria de Prêmios e Apostas do Ministério da Fazenda', indent: true }, { text: '• Associação Nacional do Jogo Responsável (ANJR)', indent: true },
        { text: 'Internacionalmente:' }, { text: '• Gamblers Anonymous: www.gamblersanonymous.org', indent: true }, { text: '• National Council on Problem Gambling: www.ncpg.org', indent: true },
      ] },
      { title: 'NÃO PERMITIMOS', paragraphs: [{ text: 'Não permitimos o jogo de:' }, { text: '• Menores de 18 anos (qualquer acesso de menores resultará em encerramento de conta e confisco de fundos)', indent: true }, { text: '• Pessoas em autoexclusão em outras plataformas (cumprimento de registros de autoexclusão nacionais)', indent: true }, { text: '• Pessoas sob ordem de afastamento do jogo por decisão judicial', indent: true }] },
      { title: 'SUPORTE FINANCEIRO', paragraphs: [{ text: 'Oferecemos ferramentas de gerenciamento financeiro:' }, { text: '• Histórico de transações completo e transparente', indent: true }, { text: '• Relatórios de gastos mensais', indent: true }, { text: '• Notificações de grandes perdas', indent: true }, { text: '• Possibilidade de solicitar devoluções de depósitos em certos casos', indent: true }] },
      { title: 'EDUCAÇÃO E INFORMAÇÃO', paragraphs: [{ text: 'Fornecemos informações educacionais sobre:' }, { text: '• Probabilidades e odds das apostas', indent: true }, { text: '• Riscos associados ao jogo', indent: true }, { text: '• Sinais de comportamento problemático', indent: true }, { text: '• Recursos de ajuda disponíveis', indent: true }] },
      { title: 'CONFORMIDADE', paragraphs: [{ text: 'O {nomeBet} está em conformidade com todas as regulamentações de jogo responsável estabelecidas pelas autoridades regulatórias brasileiras e é membro de associações de jogo responsável.' }] },
    ],
  },
  en: {
    lastUpdated: 'Last updated: April 17, 2025',
    sections: [
      { title: 'COMMITMENT TO RESPONSIBLE GAMING', paragraphs: [{ text: '{nomeBet} is deeply committed to promoting responsible and safe gaming. We recognize that gambling can be harmful when not practiced responsibly, and we are dedicated to providing tools and resources that help our customers play safely.' }] },
      { title: 'DEFINITION OF RESPONSIBLE GAMING', paragraphs: [{ text: 'Responsible gaming means playing in a balanced way, recognizing that gambling is a form of entertainment and not a source of income. It includes:' }, { text: '• Playing only with money you can afford to lose', indent: true }, { text: '• Keeping gambling as entertainment, not an escape', indent: true }, { text: '• Respecting established limits', indent: true }, { text: '• Seeking help if you suspect you have a gambling problem', indent: true }] },
      { title: 'CONTROL TOOLS', paragraphs: [
        { text: 'Deposit Limits' }, { text: 'You can set daily, weekly, or monthly limits on the amount you wish to deposit. Once set, you will not be able to deposit above the limit until the period expires.' },
        { text: 'Betting Limits' }, { text: 'You can limit the maximum amount you may wager per game or event.' },
        { text: 'Usage Time' }, { text: 'You can set time limits that will alert you when you are approaching your maximum session time.' },
        { text: 'Temporary Self-Exclusion' }, { text: 'You can request a break from gambling for a specified period (from a minimum of 1 day to a maximum of 1 year), during which your account will be suspended and you will not be able to log in or access your funds.' },
        { text: 'Permanent Self-Exclusion' }, { text: 'If you wish, you can request the permanent closure of your account, after which your funds will be returned and you will not be able to reopen the account.' },
      ] },
      { title: 'WARNING SIGNS', paragraphs: [{ text: 'Seek help if you experience any of these signs:' }, { text: '• Spending more time gambling than intended', indent: true }, { text: '• Constantly increasing bets to achieve the same excitement', indent: true }, { text: '• Lying to family or friends about how much you gamble', indent: true }, { text: '• Using gambling to escape problems', indent: true }, { text: '• Spending more money than you can afford', indent: true }, { text: '• Borrowing money to gamble', indent: true }, { text: '• Affecting your relationships or work', indent: true }] },
      { title: 'HELP RESOURCES', paragraphs: [
        { text: 'If you are struggling with gambling, resources are available to help you:' }, { text: 'In Brazil:' }, { text: '• Responsible Gaming Center: Available on our platform', indent: true }, { text: '• Secretariat of Prizes and Betting of the Ministry of Finance', indent: true }, { text: '• National Association for Responsible Gaming (ANJR)', indent: true },
        { text: 'Internationally:' }, { text: '• Gamblers Anonymous: www.gamblersanonymous.org', indent: true }, { text: '• National Council on Problem Gambling: www.ncpg.org', indent: true },
      ] },
      { title: 'WE DO NOT PERMIT', paragraphs: [{ text: 'We do not permit gambling by:' }, { text: '• Persons under 18 years of age (any underage access will result in account closure and forfeiture of funds)', indent: true }, { text: '• Persons self-excluded on other platforms (in compliance with national self-exclusion registers)', indent: true }, { text: '• Persons subject to a court order barring them from gambling', indent: true }] },
      { title: 'FINANCIAL SUPPORT', paragraphs: [{ text: 'We offer financial management tools:' }, { text: '• Complete and transparent transaction history', indent: true }, { text: '• Monthly spending reports', indent: true }, { text: '• Notifications of significant losses', indent: true }, { text: '• Ability to request deposit refunds in certain cases', indent: true }] },
      { title: 'EDUCATION AND INFORMATION', paragraphs: [{ text: 'We provide educational information about:' }, { text: '• Betting probabilities and odds', indent: true }, { text: '• Risks associated with gambling', indent: true }, { text: '• Signs of problematic behavior', indent: true }, { text: '• Available help resources', indent: true }] },
      { title: 'COMPLIANCE', paragraphs: [{ text: '{nomeBet} complies with all responsible gaming regulations established by Brazilian regulatory authorities and is a member of responsible gaming associations.' }] },
    ],
  },
  es: {
    lastUpdated: 'Última actualización: 17 de abril de 2025',
    sections: [
      { title: 'COMPROMISO CON EL JUEGO RESPONSABLE', paragraphs: [{ text: '{nomeBet} está profundamente comprometido con la promoción del juego responsable y seguro. Reconocemos que el juego puede ser perjudicial si no se practica de forma responsable y nos dedicamos a proporcionar herramientas y recursos para ayudar a nuestros clientes a jugar de forma segura.' }] },
      { title: 'DEFINICIÓN DE JUEGO RESPONSABLE', paragraphs: [{ text: 'El juego responsable significa jugar de forma equilibrada, reconociendo que el juego es una forma de entretenimiento y no una fuente de ingresos. Incluye:' }, { text: '• Jugar solo con dinero que puede permitirse perder', indent: true }, { text: '• Mantener el juego como entretenimiento, no como una vía de escape', indent: true }, { text: '• Respetar los límites establecidos', indent: true }, { text: '• Buscar ayuda si sospecha que tiene problemas con el juego', indent: true }] },
      { title: 'HERRAMIENTAS DE CONTROL', paragraphs: [
        { text: 'Límites de Depósito' }, { text: 'Puede establecer límites diarios, semanales o mensuales para la cantidad que desea depositar. Una vez establecido, no podrá depositar por encima del límite hasta que expire el período.' },
        { text: 'Límites de Apuestas' }, { text: 'Puede limitar el importe máximo que puede apostar por juego o evento.' },
        { text: 'Tiempo de Uso' }, { text: 'Puede establecer límites de tiempo que le alertarán cuando se acerque al tiempo máximo de su sesión.' },
        { text: 'Autoexclusión Temporal' }, { text: 'Puede solicitar una pausa en el juego por un período determinado (desde un mínimo de 1 día hasta un máximo de 1 año), durante el cual su cuenta será suspendida y no podrá iniciar sesión ni acceder a sus fondos.' },
        { text: 'Autoexclusión Permanente' }, { text: 'Si lo desea, puede solicitar el cierre permanente de su cuenta, después del cual sus fondos serán devueltos y no podrá volver a abrir la cuenta.' },
      ] },
      { title: 'SEÑALES DE ALERTA', paragraphs: [{ text: 'Busque ayuda si presenta alguna de estas señales:' }, { text: '• Pasa más tiempo jugando del que pretendía', indent: true }, { text: '• Aumenta constantemente las apuestas para obtener la misma emoción', indent: true }, { text: '• Miente a familiares o amigos sobre cuánto juega', indent: true }, { text: '• Usa el juego para escapar de los problemas', indent: true }, { text: '• Gasta más dinero del que puede permitirse', indent: true }, { text: '• Pide dinero prestado para jugar', indent: true }, { text: '• Afecta sus relaciones o su trabajo', indent: true }] },
      { title: 'RECURSOS DE AYUDA', paragraphs: [
        { text: 'Si tiene dificultades con el juego, hay recursos disponibles para ayudarle:' }, { text: 'En Brasil:' }, { text: '• Centro de Juego Responsable: Disponible en nuestra plataforma', indent: true }, { text: '• Secretaría de Premios y Apuestas del Ministerio de Hacienda', indent: true }, { text: '• Asociación Nacional de Juego Responsable (ANJR)', indent: true },
        { text: 'A nivel internacional:' }, { text: '• Gamblers Anonymous: www.gamblersanonymous.org', indent: true }, { text: '• National Council on Problem Gambling: www.ncpg.org', indent: true },
      ] },
      { title: 'NO PERMITIMOS', paragraphs: [{ text: 'No permitimos el juego de:' }, { text: '• Menores de 18 años (cualquier acceso de menores resultará en el cierre de la cuenta y la confiscación de fondos)', indent: true }, { text: '• Personas autoexcluidas en otras plataformas (en cumplimiento de los registros nacionales de autoexclusión)', indent: true }, { text: '• Personas sujetas a una orden judicial que les prohíba jugar', indent: true }] },
      { title: 'APOYO FINANCIERO', paragraphs: [{ text: 'Ofrecemos herramientas de gestión financiera:' }, { text: '• Historial de transacciones completo y transparente', indent: true }, { text: '• Informes mensuales de gastos', indent: true }, { text: '• Notificaciones de pérdidas importantes', indent: true }, { text: '• Posibilidad de solicitar devoluciones de depósitos en determinados casos', indent: true }] },
      { title: 'EDUCACIÓN E INFORMACIÓN', paragraphs: [{ text: 'Proporcionamos información educativa sobre:' }, { text: '• Probabilidades y cuotas de las apuestas', indent: true }, { text: '• Riesgos asociados al juego', indent: true }, { text: '• Señales de comportamiento problemático', indent: true }, { text: '• Recursos de ayuda disponibles', indent: true }] },
      { title: 'CUMPLIMIENTO', paragraphs: [{ text: '{nomeBet} cumple todas las regulaciones de juego responsable establecidas por las autoridades regulatorias brasileñas y es miembro de asociaciones de juego responsable.' }] },
    ],
  },
};
