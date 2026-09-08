-- Tabela de pastas da biblioteca (independente de terem fotos).
-- Execute no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS biblioteca_pastas (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       text NOT NULL,
  categoria  text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(nome, categoria)
);

ALTER TABLE biblioteca_pastas ENABLE ROW LEVEL SECURITY;

-- Leitura pública (o painel admin usa service_role, mas deixamos aberto para consistência).
CREATE POLICY "public read pastas"
  ON biblioteca_pastas FOR SELECT USING (true);

-- Escrita só via service_role (as server actions usam createAdminClient).
GRANT ALL ON biblioteca_pastas TO service_role;
