// =====================================================================
// Mesa Pronta - servidor Express + PostgreSQL
// Rodar: npm install && npm start   (abre em http://localhost:3000)
// Variável opcional: DATABASE_URL=postgresql://usuario:senha@localhost:5432/mesa_pronta
// =====================================================================
const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mesa_pronta',
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serve index.html, app.js e /img

// Envolve handlers async para capturar erros em um só lugar
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

// GET /api/categories -> lista de categorias
app.get('/api/categories', wrap(async (_req, res) => {
  const { rows } = await pool.query('SELECT id, name, slug FROM categories ORDER BY id');
  res.json(rows);
}));

// GET /api/products?category=slug -> produtos (filtro opcional por categoria)
app.get('/api/products', wrap(async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.category) {
    params.push(req.query.category);
    where = 'WHERE c.slug = $1';
  }
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.description, p.price_per_day::float AS price_per_day,
            p.image_url, p.stock_quantity, c.slug AS category, c.name AS category_name
       FROM products p JOIN categories c ON c.id = p.category_id
       ${where} ORDER BY c.id, p.name`,
    params
  );
  res.json(rows);
}));

// POST /api/orders -> registra o pedido (o total é recalculado no servidor)
// Body: { customer_name, customer_phone, event_date: "YYYY-MM-DD", items: [{ product_id, quantity }] }
app.post('/api/orders', wrap(async (req, res) => {
  const { customer_name, customer_phone, event_date, items } = req.body || {};
  const name = String(customer_name || '').trim();
  const phone = String(customer_phone || '').trim();

  if (!name || phone.replace(/\D/g, '').length < 10 || !/^\d{4}-\d{2}-\d{2}$/.test(event_date || '')
      || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Informe nome, telefone, data do evento e ao menos um item.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ids = items.map((i) => Number(i.product_id));
    const { rows: prods } = await client.query(
      'SELECT id, name, price_per_day, stock_quantity FROM products WHERE id = ANY($1)', [ids]);
    const byId = new Map(prods.map((p) => [p.id, p]));

    let total = 0;
    const lines = [];
    for (const it of items) {
      const p = byId.get(Number(it.product_id));
      const qty = parseInt(it.quantity, 10);
      if (!p || !(qty > 0)) throw Object.assign(new Error('Item inválido.'), { status: 400 });
      if (qty > p.stock_quantity)
        throw Object.assign(new Error(`Estoque insuficiente para "${p.name}" (máx. ${p.stock_quantity}).`), { status: 409 });
      total += Number(p.price_per_day) * qty;
      lines.push({ product_id: p.id, quantity: qty, unit_price: p.price_per_day });
    }

    const { rows: [order] } = await client.query(
      `INSERT INTO orders (customer_name, customer_phone, event_date, total_amount)
       VALUES ($1, $2, $3, $4) RETURNING id, total_amount::float AS total_amount, status`,
      [name, phone, event_date, total.toFixed(2)]);

    for (const l of lines) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4)',
        [order.id, l.product_id, l.quantity, l.unit_price]);
    }

    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  } finally {
    client.release();
  }
}));

app.listen(PORT, () => console.log(`Mesa Pronta rodando em http://localhost:${PORT}`));
