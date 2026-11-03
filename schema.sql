-- =====================================================================
-- Mesa Pronta - schema PostgreSQL
-- Uso:  createdb mesa_pronta && psql mesa_pronta -f schema.sql
-- =====================================================================

DROP TABLE IF EXISTS order_items, orders, products, categories CASCADE;

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE products (
  id             SERIAL PRIMARY KEY,
  category_id    INT NOT NULL REFERENCES categories(id),
  name           VARCHAR(120) NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  price_per_day  NUMERIC(10,2) NOT NULL CHECK (price_per_day >= 0),
  image_url      VARCHAR(255),
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)
);
CREATE INDEX idx_products_category ON products(category_id);

CREATE TABLE orders (
  id             SERIAL PRIMARY KEY,
  customer_name  VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(30)  NOT NULL,
  event_date     DATE NOT NULL,
  total_amount   NUMERIC(10,2) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','confirmado','retirado','devolvido','cancelado')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  quantity   INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL  -- preço congelado no momento do pedido
);

-- ---------------------- Dados iniciais (exemplos) ----------------------
INSERT INTO categories (name, slug) VALUES
  ('Talheres e Pratos', 'talheres-pratos'),
  ('Copos, Taças e Jarras', 'copos-tacas-jarras'),
  ('Boleiras e Expositores', 'boleiras-expositores'),
  ('Fritadeiras e Equipamentos industriais', 'equipamentos');

INSERT INTO products (category_id, name, description, price_per_day, image_url, stock_quantity) VALUES
  (1, 'Prato raso porcelana branca', 'Porcelana 27 cm, borda reta.', 1.80, '/img/prato-raso.jpg', 400),
  (1, 'Prato sobremesa dourado', 'Borda dourada, 19 cm.', 2.20, '/img/prato-sobremesa.jpg', 300),
  (1, 'Kit talher inox (garfo + faca)', 'Aço inox polido, par.', 1.50, '/img/talher-inox.jpg', 500),
  (1, 'Talher dourado (garfo + faca)', 'Acabamento dourado fosco, par.', 2.50, '/img/talher-dourado.jpg', 250),
  (2, 'Taça de vinho 350 ml', 'Cristal ecológico.', 1.60, '/img/taca-vinho.jpg', 350),
  (2, 'Copo long drink', 'Vidro transparente, 330 ml.', 1.20, '/img/copo-long.jpg', 500),
  (2, 'Jarra de vidro 1,5 L', 'Com alça, ideal para sucos e água.', 6.00, '/img/jarra.jpg', 40),
  (3, 'Boleira com pé e redoma', 'Vidro, 35 cm de diâmetro.', 25.00, '/img/boleira.jpg', 15),
  (3, 'Expositor de doces 3 andares', 'Metal dourado, desmontável.', 30.00, '/img/expositor.jpg', 12),
  (3, 'Suporte para cupcakes', 'Capacidade para 24 unidades.', 18.00, '/img/cupcakes.jpg', 10),
  (4, 'Fritadeira elétrica 5 L', 'Água e óleo, 220 V.', 90.00, '/img/fritadeira.jpg', 6),
  (4, 'Chafing dish inox', 'Com 2 cubas e réchaud.', 55.00, '/img/chafing.jpg', 14);
