import { FileText, Calendar } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';
import { useSiteBrand } from '../hooks/useSiteBrand';

interface KYCPolicyPageProps {
  onBack: () => void;
}

export default function KYCPolicyPage({ onBack }: KYCPolicyPageProps) {
  const { nomeBet } = useSiteBrand();

  return (
    <AppPageScaffold>
          <div className="max-w-5xl mx-auto px-6 py-8">
            <BackButton onClick={onBack} className="mb-6" />

            <h1 className="text-white text-3xl font-bold mb-6">Política KYC</h1>

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
                <h2 className="text-white text-xl font-bold mb-4">VISÃO GERAL KYC</h2>
                <div className="space-y-4">
                  <p>
                    A Política KYC (Know Your Customer) do {nomeBet} estabelece os procedimentos e requisitos para verificação de identidade e conformidade de nossos
                    usuários. Esta política está em conformidade com regulamentações brasileiras e internacionais de combate à fraude e lavagem de dinheiro.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">PROCESSO DE VERIFICAÇÃO</h2>
                <div className="space-y-4">
                  <p className="font-semibold text-white">Nível 1: Verificação Básica</p>
                  <p>
                    Requerido para criar uma conta e fazer apostas:
                  </p>
                  <p className="pl-4">
                    • Nome completo
                  </p>
                  <p className="pl-4">
                    • Data de nascimento
                  </p>
                  <p className="pl-4">
                    • E-mail válido
                  </p>
                  <p className="pl-4">
                    • Número de telefone

                  </p>

                  <p className="font-semibold text-white mt-6">Nível 2: Verificação Intermediária</p>
                  <p>
                    Requerida antes de saques acima de R$ 5.000:
                  </p>
                  <p className="pl-4">
                    • Cópia do documento de identidade (CPF, RG ou CNH)
                  </p>
                  <p className="pl-4">
                    • Verificação de endereço (conta de utilidade ou extrato bancário)
                  </p>
                  <p className="pl-4">
                    • Selfie com documento de identidade
                  </p>

                  <p className="font-semibold text-white mt-6">Nível 3: Verificação Avançada</p>
                  <p>
                    Requerida em casos de suspeita de atividade suspeita ou saques acima de R$ 20.000:
                  </p>
                  <p className="pl-4">
                    • Comprovação de origem de fundos
                  </p>
                  <p className="pl-4">
                    • Extratos bancários dos últimos 3 meses
                  </p>
                  <p className="pl-4">
                    • Comprovação de emprego ou negócio
                  </p>
                  <p className="pl-4">
                    • Possível entrevista com equipe de compliance
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">REQUISITOS DE ELEGIBILIDADE</h2>
                <div className="space-y-4">
                  <p>
                    Para passar na verificação KYC, você deve:
                  </p>
                  <p className="pl-4">
                    • Ter pelo menos 18 anos de idade
                  </p>
                  <p className="pl-4">
                    • Ser um cidadão brasileiro ou residente legal no Brasil
                  </p>
                  <p className="pl-4">
                    • Não estar em nenhuma lista de sanções internacionais
                  </p>
                  <p className="pl-4">
                    • Não ser politicamente exposto (PEP) ou estar associado a indivíduos PEP
                  </p>
                  <p className="pl-4">
                    • Possuir CPF válido e ativo
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">DOCUMENTOS ACEITOS</h2>
                <div className="space-y-4">
                  <p>
                    Para verificação de identidade, aceitamos os seguintes documentos:
                  </p>
                  <p className="pl-4">
                    • CPF (Cadastro de Pessoa Física)
                  </p>
                  <p className="pl-4">
                    • RG (Registro Geral)
                  </p>
                  <p className="pl-4">
                    • CNH (Carteira Nacional de Habilitação)
                  </p>
                  <p className="pl-4">
                    • Passaporte
                  </p>

                  <p className="font-semibold text-white mt-6">Documentos Devem:</p>
                  <p className="pl-4">
                    • Ser originais e legíveis
                  </p>
                  <p className="pl-4">
                    • Estar válidos e não expirados
                  </p>
                  <p className="pl-4">
                    • Conter foto legível do titular
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">VERIFICAÇÃO DE ENDEREÇO</h2>
                <div className="space-y-4">
                  <p>
                    Para comprovar seu endereço de residência, você pode fornecer:
                  </p>
                  <p className="pl-4">
                    • Conta de água, luz ou telefone
                  </p>
                  <p className="pl-4">
                    • Extrato bancário
                  </p>
                  <p className="pl-4">
                    • Contrato de aluguel ou comprovante de propriedade
                  </p>
                  <p className="pl-4">
                    • Declaração de imposto de renda
                  </p>

                  <p>
                    O documento deve estar em seu nome e ter data de emissão não superior a 3 meses.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">TEMPO DE PROCESSAMENTO</h2>
                <div className="space-y-4">
                  <p>
                    • Verificação Básica: Imediata
                  </p>
                  <p>
                    • Verificação Intermediária: 1-2 dias úteis
                  </p>
                  <p>
                    • Verificação Avançada: 3-5 dias úteis
                  </p>
                  <p>
                    Em casos complexos, o processamento pode levar mais tempo. Você será notificado sobre o status de sua verificação.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">REJEIÇÃO DE VERIFICAÇÃO</h2>
                <div className="space-y-4">
                  <p>
                    Se sua verificação for rejeitada, você terá a oportunidade de:
                  </p>
                  <p className="pl-4">
                    • Receber explicação detalhada do motivo da rejeição
                  </p>
                  <p className="pl-4">
                    • Enviar novamente com informações ou documentos corrigidos
                  </p>
                  <p className="pl-4">
                    • Entrar em contato com nosso suporte para esclarecimentos
                  </p>
                  <p>
                    Rejeições repetidas podem resultar no encerramento permanente da sua conta.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">PRIVACIDADE E SEGURANÇA</h2>
                <div className="space-y-4">
                  <p>
                    Todos os documentos enviados são criptografados e armazenados com segurança. Seus dados pessoais são tratados conforme nossa Política de
                    Privacidade e regulamentações aplicáveis.
                  </p>
                  <p>
                    Os documentos são retentos conforme requisitos regulatórios e depois destruídos com segurança.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-white text-xl font-bold mb-4">INFORMAÇÕES FALSAS</h2>
                <div className="space-y-4">
                  <p>
                    Fornecer informações falsas, documentos fraudulentos ou enganosos durante o processo KYC resultará em:
                  </p>
                  <p className="pl-4">
                    • Rejeição imediata da verificação
                  </p>
                  <p className="pl-4">
                    • Encerramento permanente da conta
                  </p>
                  <p className="pl-4">
                    • Confisco de todos os fundos
                  </p>
                  <p className="pl-4">
                    • Possível relatório às autoridades regulatórias
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
