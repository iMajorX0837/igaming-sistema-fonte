-- Criar tabela de rodadas (velas) do Aviator
CREATE TABLE IF NOT EXISTS public.aviator_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number BIGSERIAL, -- Número sequencial da rodada
  
  -- Dados da vela
  target_multiplier DECIMAL(10,2) NOT NULL, -- Multiplicador alvo (onde vai crashar)
  final_multiplier DECIMAL(10,2), -- Multiplicador final (quando crashou, igual ao target)
  
  -- Estado da rodada
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'flying', 'crashed')),
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  crashed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar tabela de apostas do Aviator
CREATE TABLE IF NOT EXISTS public.aviator_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.aviator_rounds(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  
  -- Dados da aposta
  bet_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cashout_multiplier DECIMAL(10,2), -- Multiplicador no momento do cashout (null se não fez cashout)
  profit DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Lucro final (0 se não fez cashout ou crashou antes)
  
  -- Status da aposta
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cashed_out', 'crashed')),
  
  -- Timestamps
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  cashed_out_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS aviator_rounds_status_idx ON public.aviator_rounds(status);
CREATE INDEX IF NOT EXISTS aviator_rounds_created_at_idx ON public.aviator_rounds(created_at DESC);
CREATE INDEX IF NOT EXISTS aviator_rounds_round_number_idx ON public.aviator_rounds(round_number DESC);

CREATE INDEX IF NOT EXISTS aviator_bets_round_id_idx ON public.aviator_bets(round_id);
CREATE INDEX IF NOT EXISTS aviator_bets_usuario_id_idx ON public.aviator_bets(usuario_id);
CREATE INDEX IF NOT EXISTS aviator_bets_status_idx ON public.aviator_bets(status);
CREATE INDEX IF NOT EXISTS aviator_bets_placed_at_idx ON public.aviator_bets(placed_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.aviator_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aviator_bets ENABLE ROW LEVEL SECURITY;

-- Políticas para aviator_rounds (todos podem ver as rodadas)
CREATE POLICY "Todos podem ver rodadas do Aviator"
  ON public.aviator_rounds
  FOR SELECT
  USING (true);

CREATE POLICY "Apenas service role pode criar/atualizar rodadas"
  ON public.aviator_rounds
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para aviator_bets (usuários veem apenas suas apostas)
CREATE POLICY "Usuários podem ver apenas suas próprias apostas"
  ON public.aviator_bets
  FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem criar suas próprias apostas"
  ON public.aviator_bets
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Service role pode gerenciar todas as apostas"
  ON public.aviator_bets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at_aviator_rounds()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER set_updated_at_aviator_rounds
  BEFORE UPDATE ON public.aviator_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_aviator_rounds();

