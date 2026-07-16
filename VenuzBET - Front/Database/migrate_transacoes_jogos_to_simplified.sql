-- Script para migrar a tabela transacoes_jogos para o formato simplificado
-- ATENÇÃO: Faça backup antes de executar!

-- 1. Criar nova tabela temporária com a estrutura simplificada
CREATE TABLE IF NOT EXISTS public.transacoes_jogos_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  
  -- Campos solicitados
  tipo TEXT NOT NULL CHECK (tipo IN ('Ganhou', 'Perdeu')),
  jogo TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  retorno DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'Finalizado',
  com_bonus TEXT NOT NULL DEFAULT 'Não',
  data TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Campos auxiliares
  txn_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Migrar dados existentes (se houver)
-- Nota: Como não temos o nome do jogo nos dados antigos, vamos usar um padrão
INSERT INTO public.transacoes_jogos_new (
  usuario_id,
  tipo,
  jogo,
  valor,
  retorno,
  status,
  com_bonus,
  data,
  txn_id,
  created_at
)
SELECT 
  usuario_id,
  CASE WHEN win > 0 THEN 'Ganhou' ELSE 'Perdeu' END as tipo,
  COALESCE(game_code, 'Jogo Desconhecido') as jogo,
  bet as valor,
  CASE WHEN win > 0 THEN win ELSE 0 END as retorno,
  'Finalizado' as status,
  'Não' as com_bonus,
  COALESCE(created_at, NOW()) as data,
  txn_id,
  created_at
FROM public.transacoes_jogos
WHERE EXISTS (SELECT 1 FROM public.transacoes_jogos);

-- 3. Remover tabela antiga
DROP TABLE IF EXISTS public.transacoes_jogos CASCADE;

-- 4. Renomear nova tabela
ALTER TABLE public.transacoes_jogos_new RENAME TO transacoes_jogos;

-- 5. Criar índices
CREATE INDEX IF NOT EXISTS transacoes_jogos_usuario_id_idx ON public.transacoes_jogos(usuario_id);
CREATE INDEX IF NOT EXISTS transacoes_jogos_txn_id_idx ON public.transacoes_jogos(txn_id);
CREATE INDEX IF NOT EXISTS transacoes_jogos_data_idx ON public.transacoes_jogos(data DESC);
CREATE INDEX IF NOT EXISTS transacoes_jogos_tipo_idx ON public.transacoes_jogos(tipo);

-- 6. Habilitar RLS
ALTER TABLE public.transacoes_jogos ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas
CREATE POLICY "Usuários podem ver apenas suas próprias transações de jogos"
  ON public.transacoes_jogos
  FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Permitir inserção de transações via service role"
  ON public.transacoes_jogos
  FOR INSERT
  WITH CHECK (true);

