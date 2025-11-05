/*
  # Criar estrutura completa do BioUrb

  ## 1. Novas Tabelas
    - `usuario`
      - `id` (serial, primary key)
      - `cpf` (varchar, unique)
      - `nome` (varchar)
      - `email` (varchar, unique)
      - `senha` (varchar)
      - `is_admin` (boolean, default false)
      - `created_at` (timestamp, default now())
    
    - `areas_verdes`
      - `id` (serial, primary key)
      - `nome` (varchar)
      - `descricao` (text)
      - `localizacao` (text)
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `responsavel` (varchar)
      - `status` (varchar: 'Ativa', 'Em Manutenção', 'Planejada')
      - `imagem_url` (text)
      - `usuario_id` (int, foreign key)
      - `created_at` (timestamp, default now())
    
    - `arvore`
      - `id` (serial, primary key)
      - `nome_cientifico` (varchar)
      - `nome_popular` (varchar)
      - `data_plantio` (date)
      - `altura` (decimal)
      - `diametro` (decimal)
      - `estado_saude` (varchar)
      - `localizacao` (text)
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `imagem_url` (text)
      - `area_verde_id` (int, foreign key, nullable)
      - `usuario_id` (int, foreign key)
      - `created_at` (timestamp, default now())
  
  ## 2. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas para usuários autenticados
    - Políticas de leitura pública para visualização
*/

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuario (
  id SERIAL PRIMARY KEY,
  cpf VARCHAR(20) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de áreas verdes
CREATE TABLE IF NOT EXISTS areas_verdes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  localizacao TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  responsavel VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Ativa',
  imagem_url TEXT,
  usuario_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_area_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuario(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Criar/atualizar tabela de árvores
CREATE TABLE IF NOT EXISTS arvore (
  id SERIAL PRIMARY KEY,
  nome_cientifico VARCHAR(255) NOT NULL,
  nome_popular VARCHAR(255),
  data_plantio DATE NOT NULL,
  altura DECIMAL(5, 2),
  diametro DECIMAL(5, 2),
  estado_saude VARCHAR(255) NOT NULL,
  localizacao TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  imagem_url TEXT,
  area_verde_id INT,
  usuario_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_arvore_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuario(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_arvore_area FOREIGN KEY (area_verde_id)
    REFERENCES areas_verdes(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Adicionar colunas faltantes na tabela arvore se já existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arvore' AND column_name = 'nome_popular'
  ) THEN
    ALTER TABLE arvore ADD COLUMN nome_popular VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arvore' AND column_name = 'altura'
  ) THEN
    ALTER TABLE arvore ADD COLUMN altura DECIMAL(5, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arvore' AND column_name = 'diametro'
  ) THEN
    ALTER TABLE arvore ADD COLUMN diametro DECIMAL(5, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arvore' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE arvore ADD COLUMN latitude DECIMAL(10, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arvore' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE arvore ADD COLUMN longitude DECIMAL(11, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arvore' AND column_name = 'imagem_url'
  ) THEN
    ALTER TABLE arvore ADD COLUMN imagem_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arvore' AND column_name = 'area_verde_id'
  ) THEN
    ALTER TABLE arvore ADD COLUMN area_verde_id INT;
    ALTER TABLE arvore ADD CONSTRAINT fk_arvore_area 
      FOREIGN KEY (area_verde_id) REFERENCES areas_verdes(id) 
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'arvore' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE arvore ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas_verdes ENABLE ROW LEVEL SECURITY;
ALTER TABLE arvore ENABLE ROW LEVEL SECURITY;

-- Políticas para usuário (apenas admins podem gerenciar usuários)
CREATE POLICY "Usuários podem ver próprio perfil"
  ON usuario FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Admins podem ver todos usuários"
  ON usuario FOR SELECT
  TO authenticated
  USING (is_admin = true);

-- Políticas para áreas verdes
CREATE POLICY "Todos podem visualizar áreas verdes"
  ON areas_verdes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar áreas verdes"
  ON areas_verdes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = usuario_id::text);

CREATE POLICY "Usuários podem atualizar suas áreas verdes"
  ON areas_verdes FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = usuario_id::text)
  WITH CHECK (auth.uid()::text = usuario_id::text);

CREATE POLICY "Usuários podem deletar suas áreas verdes"
  ON areas_verdes FOR DELETE
  TO authenticated
  USING (auth.uid()::text = usuario_id::text);

CREATE POLICY "Admins podem gerenciar todas áreas verdes"
  ON areas_verdes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuario 
      WHERE usuario.id::text = auth.uid()::text 
      AND usuario.is_admin = true
    )
  );

-- Políticas para árvores
CREATE POLICY "Todos podem visualizar árvores"
  ON arvore FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem cadastrar árvores"
  ON arvore FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = usuario_id::text);

CREATE POLICY "Usuários podem atualizar suas árvores"
  ON arvore FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = usuario_id::text)
  WITH CHECK (auth.uid()::text = usuario_id::text);

CREATE POLICY "Usuários podem deletar suas árvores"
  ON arvore FOR DELETE
  TO authenticated
  USING (auth.uid()::text = usuario_id::text);

CREATE POLICY "Admins podem gerenciar todas árvores"
  ON arvore FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuario 
      WHERE usuario.id::text = auth.uid()::text 
      AND usuario.is_admin = true
    )
  );

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_arvore_usuario ON arvore(usuario_id);
CREATE INDEX IF NOT EXISTS idx_arvore_area ON arvore(area_verde_id);
CREATE INDEX IF NOT EXISTS idx_area_usuario ON areas_verdes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_email ON usuario(email);
