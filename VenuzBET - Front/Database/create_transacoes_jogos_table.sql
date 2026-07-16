-- Criar tabela de transações de jogos da Play Fiver
CREATE TABLE IF NOT EXISTS public.transacoes_jogos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  
  -- Dados da transação
  txn_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'WinBet', etc.
  game_type TEXT, -- 'slot', 'live', etc.
  
  -- Dados do jogo
  provider_code TEXT,
  game_code TEXT,
  game_round_type TEXT, -- 'BASE', 'BONUS', etc.
  round_id TEXT,
  
  -- Valores financeiros
  bet DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  win DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  user_before_balance DECIMAL(10,2) NOT NULL,
  user_after_balance DECIMAL(10,2) NOT NULL,
  
  -- Metadados
  txn_type TEXT, -- 'debit_credit', etc.
  agent_code TEXT,
  game_original BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS transacoes_jogos_usuario_id_idx ON public.transacoes_jogos(usuario_id);
CREATE INDEX IF NOT EXISTS transacoes_jogos_txn_id_idx ON public.transacoes_jogos(txn_id);
CREATE INDEX IF NOT EXISTS transacoes_jogos_round_id_idx ON public.transacoes_jogos(round_id);
CREATE INDEX IF NOT EXISTS transacoes_jogos_created_at_idx ON public.transacoes_jogos(created_at DESC);
CREATE INDEX IF NOT EXISTS transacoes_jogos_game_code_idx ON public.transacoes_jogos(game_code);
CREATE INDEX IF NOT EXISTS transacoes_jogos_provider_code_idx ON public.transacoes_jogos(provider_code);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.transacoes_jogos ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas suas próprias transações
CREATE POLICY "Usuários podem ver apenas suas próprias transações de jogos"
  ON public.transacoes_jogos
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Política para inserção via service role (para webhook)
-- Nota: Esta política permite inserção sem autenticação do usuário
-- pois o webhook precisa inserir transações usando service role key
CREATE POLICY "Permitir inserção de transações via service role"
  ON public.transacoes_jogos
  FOR INSERT
  WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at_transacoes_jogos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER set_updated_at_transacoes_jogos
  BEFORE UPDATE ON public.transacoes_jogos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_transacoes_jogos();

