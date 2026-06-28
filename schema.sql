-- ═══════════════════════════════════════════════════════════════════════════
--  DENTELLE — Schéma Supabase complet
--  Exécuter dans l'éditeur SQL de Supabase (Settings > SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. CATEGORIES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  description TEXT,
  image_url   TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. PRODUCTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  sizes        TEXT[] DEFAULT '{}',
  colors       TEXT[] DEFAULT '{}',
  is_active    BOOLEAN DEFAULT TRUE,
  is_featured  BOOLEAN DEFAULT FALSE,
  cover_image  TEXT,   -- chemin rapide vers l'image principale
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. PRODUCT IMAGES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,   -- chemin dans le bucket Storage
  is_cover    BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. ORDERS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_first_name  TEXT NOT NULL,
  customer_last_name   TEXT NOT NULL,
  customer_email       TEXT NOT NULL,
  customer_phone       TEXT NOT NULL,
  customer_address     TEXT NOT NULL,
  customer_city        TEXT NOT NULL,
  customer_comment     TEXT,
  total_amount         NUMERIC(10,2) NOT NULL,
  status               TEXT NOT NULL DEFAULT 'nouvelle'
                         CHECK (status IN ('nouvelle','confirmee','preparation','expediee','livree','annulee')),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. ORDER ITEMS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,   -- snapshot au moment de la commande
  size          TEXT NOT NULL,
  color         TEXT NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(10,2) NOT NULL,
  total_price   NUMERIC(10,2) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. ADMIN USERS (référence facultative, l'auth est gérée par Supabase Auth) ─
CREATE TABLE IF NOT EXISTS admin_users (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  full_name  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEX
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active      ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured    ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_product_images_pid   ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_email         ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_order_items_order    ON order_items(order_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

-- Activer RLS sur toutes les tables
ALTER TABLE categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users    ENABLE ROW LEVEL SECURITY;

-- ── Categories : lecture publique, écriture admin uniquement ──────────────────
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (TRUE);

CREATE POLICY "categories_admin_write" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

-- ── Products : lecture publique (actifs), écriture admin ─────────────────────
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "products_admin_all" ON products
  FOR ALL USING (auth.role() = 'authenticated');

-- ── Product Images : lecture publique, écriture admin ────────────────────────
CREATE POLICY "product_images_public_read" ON product_images
  FOR SELECT USING (TRUE);

CREATE POLICY "product_images_admin_write" ON product_images
  FOR ALL USING (auth.role() = 'authenticated');

-- ── Orders : insertion publique (clients sans compte), lecture/modif admin ────
CREATE POLICY "orders_public_insert" ON orders
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "orders_admin_all" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

-- ── Order Items : insertion publique, lecture/modif admin ─────────────────────
CREATE POLICY "order_items_public_insert" ON order_items
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "order_items_admin_all" ON order_items
  FOR ALL USING (auth.role() = 'authenticated');

-- ── Admin Users : lecture/modif pour l'admin authentifié uniquement ───────────
CREATE POLICY "admin_users_self" ON admin_users
  FOR ALL USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE — Bucket produits
-- ═══════════════════════════════════════════════════════════════════════════
-- À exécuter dans l'onglet Storage > New bucket OU via SQL :

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  TRUE,
  10485760,   -- 10 Mo
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Policy Storage : lecture publique
CREATE POLICY "storage_products_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

-- Policy Storage : upload admin uniquement
CREATE POLICY "storage_products_admin_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

-- Policy Storage : suppression admin uniquement
CREATE POLICY "storage_products_admin_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════════════════
-- DONNÉES D'EXEMPLE (optionnel — à adapter ou supprimer en production)
-- ═══════════════════════════════════════════════════════════════════════════

-- Catégories
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Soutiens-gorge',  'soutiens-gorge',  1),
  ('Culottes',        'culottes',        2),
  ('Nuisettes',       'nuisettes',       3),
  ('Sets coordonnés', 'sets-coordonnes', 4),
  ('Déshabillés',     'deshabilles',     5),
  ('Bodys',           'bodys',           6)
ON CONFLICT DO NOTHING;

-- Produit d'exemple
INSERT INTO products (name, description, price, stock, sizes, colors, is_active, is_featured)
VALUES
  ('Soutien-gorge Dentelle Rose',
   'Soutien-gorge en dentelle fine rose poudré, doublure en microfibre douce. Bretelles ajustables. Confection soignée.',
   249.00, 30,
   ARRAY['85B','85C','90B','90C','95B','95C'],
   ARRAY['Rose','Blanc','Noir'],
   TRUE, TRUE),
  ('Set Satin Ivoire',
   'Ensemble deux pièces en satin de soie ivoire. Soutien-gorge et culotte assortis. Élégance absolue.',
   389.00, 15,
   ARRAY['S','M','L','XL'],
   ARRAY['Ivoire','Nude','Noir'],
   TRUE, TRUE),
  ('Nuisette Dentelle Noire',
   'Nuisette mi-longue en dentelle noire, légère et sensuelle. Parfaite pour une soirée romantique.',
   299.00, 20,
   ARRAY['S','M','L','XL'],
   ARRAY['Noir','Bordeaux'],
   TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER : mise à jour automatique de updated_at
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- CRÉER UN ADMIN — À exécuter APRÈS avoir créé l'utilisateur dans
-- Supabase Auth > Users > Invite user
-- ═══════════════════════════════════════════════════════════════════════════
-- Remplacer 'VOTRE_USER_ID' et 'admin@dentelle.ma' par les vraies valeurs :
--
-- INSERT INTO admin_users (id, email, full_name)
-- VALUES ('VOTRE_USER_ID', 'admin@dentelle.ma', 'Administratrice')
-- ON CONFLICT DO NOTHING;
