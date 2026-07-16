-- Criar tabela de depósitos
CREATE TABLE IF NOT EXISTS public.depositos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('aprovado', 'pendente')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar tabela de saques
CREATE TABLE IF NOT EXISTS public.saques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  data_hora TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('aprovado', 'rejeitado', 'pendente')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS depositos_usuario_id_idx ON public.depositos(usuario_id);
CREATE INDEX IF NOT EXISTS depositos_data_hora_idx ON public.depositos(data_hora DESC);
CREATE INDEX IF NOT EXISTS depositos_status_idx ON public.depositos(status);

CREATE INDEX IF NOT EXISTS saques_usuario_id_idx ON public.saques(usuario_id);
CREATE INDEX IF NOT EXISTS saques_data_hora_idx ON public.saques(data_hora DESC);
CREATE INDEX IF NOT EXISTS saques_status_idx ON public.saques(status);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saques ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios depósitos
CREATE POLICY "Usuários podem ver apenas seus próprios depósitos"
  ON public.depositos
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Política para usuários inserirem apenas seus próprios depósitos
CREATE POLICY "Usuários podem inserir apenas seus próprios depósitos"
  ON public.depositos
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Política para usuários verem apenas seus próprios saques
CREATE POLICY "Usuários podem ver apenas seus próprios saques"
  ON public.saques
  FOR SELECT
  USING (auth.uid() = usuario_id);

-- Política para usuários inserirem apenas seus próprios saques
CREATE POLICY "Usuários podem inserir apenas seus próprios saques"
  ON public.saques
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Função para atualizar updated_at automaticamente em depósitos
CREATE OR REPLACE FUNCTION public.handle_updated_at_depositos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar updated_at automaticamente em saques
CREATE OR REPLACE FUNCTION public.handle_updated_at_saques()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at em depósitos
CREATE TRIGGER set_updated_at_depositos
  BEFORE UPDATE ON public.depositos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_depositos();

-- Trigger para atualizar updated_at em saques
CREATE TRIGGER set_updated_at_saques
  BEFORE UPDATE ON public.saques
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_saques();

-- Função para devolver o valor ao saldo quando um saque for rejeitado
CREATE OR REPLACE FUNCTION public.handle_saque_rejeitado()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudou para 'rejeitado' e antes não era 'rejeitado'
  IF NEW.status = 'rejeitado' AND OLD.status != 'rejeitado' THEN
    -- Adicionar o valor de volta ao saldo do usuário
    UPDATE public.usuarios
    SET saldo = saldo + NEW.valor
    WHERE id = NEW.usuario_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para devolver o valor quando um saque for rejeitado
CREATE TRIGGER devolver_valor_saque_rejeitado
  AFTER UPDATE ON public.saques
  FOR EACH ROW
  WHEN (NEW.status = 'rejeitado' AND OLD.status != 'rejeitado')
  EXECUTE FUNCTION public.handle_saque_rejeitado();

