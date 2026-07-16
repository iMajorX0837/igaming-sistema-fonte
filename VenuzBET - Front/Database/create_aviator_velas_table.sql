-- Criar tabela de velas do Aviator
-- Esta tabela armazena todas as velas (rodadas finalizadas) para exibição do histórico
CREATE TABLE IF NOT EXISTS public.aviator_velas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.aviator_rounds(id) ON DELETE SET NULL,
  
  -- Dados da vela
  multiplier DECIMAL(10,2) NOT NULL, -- Multiplicador final da vela
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS aviator_velas_round_id_idx ON public.aviator_velas(round_id);
CREATE INDEX IF NOT EXISTS aviator_velas_created_at_idx ON public.aviator_velas(created_at DESC);
CREATE INDEX IF NOT EXISTS aviator_velas_multiplier_idx ON public.aviator_velas(multiplier);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.aviator_velas ENABLE ROW LEVEL SECURITY;

-- Política para todos poderem ver as velas (histórico público)
CREATE POLICY "Todos podem ver velas do Aviator"
  ON public.aviator_velas
  FOR SELECT
  USING (true);

-- Política para service role poder inserir velas
CREATE POLICY "Service role pode inserir velas"
  ON public.aviator_velas
  FOR INSERT
  WITH CHECK (true);

-- Função para inserir vela automaticamente quando uma rodada crasha
CREATE OR REPLACE FUNCTION public.insert_aviator_vela()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando uma rodada crasha e tem um multiplicador final, inserir na tabela de velas
  IF NEW.status = 'crashed' AND NEW.final_multiplier IS NOT NULL THEN
    INSERT INTO public.aviator_velas (round_id, multiplier)
    VALUES (NEW.id, NEW.final_multiplier)
    ON CONFLICT DO NOTHING; -- Evitar duplicatas se o trigger for chamado múltiplas vezes
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para inserir vela automaticamente quando rodada crasha
DROP TRIGGER IF EXISTS trigger_insert_aviator_vela ON public.aviator_rounds;
CREATE TRIGGER trigger_insert_aviator_vela
  AFTER UPDATE ON public.aviator_rounds
  FOR EACH ROW
  WHEN (NEW.status = 'crashed' AND OLD.status != 'crashed')
  EXECUTE FUNCTION public.insert_aviator_vela();

