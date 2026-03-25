-- =========================
-- CANONICAL PRODUCTS
-- =========================

-- Tabela de produtos canônicos
CREATE TABLE public.canonical_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- ex: coca_cola_2l
  name TEXT NOT NULL, -- Nome amigável (ex: "Coca-Cola 2L")
  category TEXT, -- Categoria (ex: "Bebidas")
  brand TEXT, -- Marca (ex: "Coca-Cola")
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  merge_count INTEGER DEFAULT 1, -- Quantos produtos foram merged
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_canonical_products_user ON public.canonical_products(user_id);
CREATE INDEX idx_canonical_products_slug ON public.canonical_products(user_id, slug);
CREATE INDEX idx_canonical_products_category ON public.canonical_products(user_id, category);
CREATE INDEX idx_canonical_products_brand ON public.canonical_products(user_id, brand);

-- RLS Policies
ALTER TABLE public.canonical_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê seus produtos canônicos"
ON public.canonical_products FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuário insere seus produtos canônicos"
ON public.canonical_products FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza seus produtos canônicos"
ON public.canonical_products FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário deleta seus produtos canônicos"
ON public.canonical_products FOR DELETE
USING (auth.uid() = user_id);

-- =========================
-- ALTERAÇÕES EM ITEMS
-- =========================

-- Adicionar campo canonical_product_id
ALTER TABLE public.items ADD COLUMN canonical_product_id UUID REFERENCES public.canonical_products(id);

-- Índice para performance
CREATE INDEX idx_items_canonical_product ON public.items(canonical_product_id);

-- =========================
-- ALTERAÇÕES EM PRODUCT_DICTIONARY
-- =========================

-- Adicionar campo canonical_product_id
ALTER TABLE public.product_dictionary ADD COLUMN canonical_product_id UUID REFERENCES public.canonical_products(id);

-- Índice para performance
CREATE INDEX idx_product_dictionary_canonical ON public.product_dictionary(canonical_product_id);

-- =========================
-- TRIGGER PARA UPDATED_AT
-- =========================

CREATE OR REPLACE FUNCTION update_canonical_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_canonical_product_updated_at
  BEFORE UPDATE ON public.canonical_products
  FOR EACH ROW EXECUTE FUNCTION update_canonical_product_updated_at();