-- Recriar tabela de transações de jogos simplificada
-- Primeiro, remover a tabela antiga se existir (CUIDADO: isso apaga dados existentes!)
-- DROP TABLE IF EXISTS public.transacoes_jogos CASCADE;

-- Criar nova tabela simplificada
CREATE TABLE IF NOT EXISTS public.transacoes_jogos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  
  -- Campos solicitados
  tipo TEXT NOT NULL CHECK (tipo IN ('Ganhou', 'Perdeu')),
  jogo TEXT NOT NULL, -- Nome do jogo
  valor DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Valor da aposta
  retorno DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Valor ganho (0 se perdeu)
  status TEXT NOT NULL DEFAULT 'Finalizado',
  com_bonus TEXT NOT NULL DEFAULT 'Não',
  data TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Campos auxiliares para controle (não exibidos)
  txn_id TEXT UNIQUE, -- Para evitar duplicatas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS transacoes_jogos_usuario_id_idx ON public.transacoes_jogos(usuario_id);
CREATE INDEX IF NOT EXISTS transacoes_jogos_txn_id_idx ON public.transacoes_jogos(txn_id);
CREATE INDEX IF NOT EXISTS transacoes_jogos_data_idx ON public.transacoes_jogos(data DESC);
CREATE INDEX IF NOT EXISTS transacoes_jogos_tipo_idx ON public.transacoes_jogos(tipo);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.transacoes_jogos ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas suas próprias transações
CREATE POLICY "Usuários podem ver apenas suas próprias transações de jogos"
  ON public.transacoes_jogos
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Política para inserção via service role (para webhook)
CREATE POLICY "Permitir inserção de transações via service role"
  ON public.transacoes_jogos
  FOR INSERT
  WITH CHECK (true);

