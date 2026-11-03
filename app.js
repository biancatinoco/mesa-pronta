// =====================================================================
// Mesa Pronta - front-end (JavaScript puro)
// =====================================================================

// >>> CONFIGURE AQUI: número da loja com código do país + DDD, só dígitos <<<
const WHATSAPP_NUMBER = '5511999999999';

const $ = (s) => document.querySelector(s);
const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let products = [];
let cart = {}; // { productId: quantidade }

// ---------- Conteúdo editorial (troque as imagens em /public/img) ----------
const INSPIRE = [
  { t: 'Casamento rústico', img: '/img/mesa-rustica.jpg' },
  { t: 'Jantar clássico', img: '/img/mesa-classica.jpg' },
  { t: 'Coquetel dourado', img: '/img/mesa-coquetel.jpg' },
];
const REVIEWS = [
  { q: 'Tudo chegou impecável e eu não precisei lavar nada. Valeu cada centavo.', a: 'Camila R., casamento' },
  { q: 'A calculadora acertou a quantidade de taças para os 80 convidados.', a: 'Marcos T., aniversário de 50 anos' },
  { q: 'Atendimento rápido pelo WhatsApp e peças lindas na mesa.', a: 'Juliana S., jantar de noivado' },
];

// ---------- API ----------
async function api(path, opts) {
  const r = await fetch(path, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Falha na requisição.');
  return data;
}

async function init() {
  $('#yr').textContent = new Date().getFullYear();
  $('#cDate').min = new Date().toISOString().split('T')[0];
  try { cart = JSON.parse(localStorage.getItem('mp_cart')) || {}; } catch { cart = {}; }
  renderStatic();
  try {
    const [cats, prods] = await Promise.all([api('/api/categories'), api('/api/products')]);
    products = prods;
    renderCatalog(cats);
    // Remove do carrinho itens que não existem mais
    Object.keys(cart).forEach((id) => { if (!products.find((p) => p.id == id)) delete cart[id]; });
    renderCart();
  } catch (e) {
    $('#catalog').innerHTML = `<p class="empty">Não foi possível carregar o catálogo agora. Tente novamente em instantes.</p>`;
  }
}

// ---------- Renderização ----------
function renderStatic() {
  $('#gallery').innerHTML = INSPIRE.map((g) => `
    <figure><div class="ph"><img src="${g.img}" alt="${esc(g.t)}" loading="lazy" onerror="this.remove()"></div>
    <figcaption>${esc(g.t)}</figcaption></figure>`).join('');
  $('#testimonials').innerHTML = REVIEWS.map((r) => `
    <div class="quote"><div class="stars" aria-label="5 estrelas">★★★★★</div><p>“${esc(r.q)}”</p><cite>${esc(r.a)}</cite></div>`).join('');
}

function renderCatalog(cats) {
  $('#catLinks').innerHTML = cats.map((c) =>
    `<a class="cat-link" href="#cat-${esc(c.slug)}"><h3>${esc(c.name)}</h3><p>Ver peças</p></a>`).join('');

  $('#catalog').innerHTML = cats.map((c) => {
    const items = products.filter((p) => p.category === c.slug);
    return `<div class="cat-block" id="cat-${esc(c.slug)}"><h3>${esc(c.name)}</h3>
      <div class="grid g4">${items.map(card).join('') || '<p class="empty">Em breve.</p>'}</div></div>`;
  }).join('');
}

const card = (p) => `
  <article class="card">
    <div class="ph"><img src="${esc(p.image_url || '')}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()"></div>
    <div class="body">
      <h4 style="font:600 1.25rem var(--serif)">${esc(p.name)}</h4>
      <p class="desc">${esc(p.description)}</p>
      <div class="price">${brl(p.price_per_day)} <small>/ diária</small></div>
      <button class="btn" data-add="${p.id}">Adicionar</button>
    </div>
  </article>`;

// ---------- Carrinho ----------
const save = () => localStorage.setItem('mp_cart', JSON.stringify(cart));
const cartLines = () => Object.entries(cart)
  .map(([id, qty]) => ({ p: products.find((x) => x.id == id), qty }))
  .filter((l) => l.p);
const total = () => cartLines().reduce((s, l) => s + l.p.price_per_day * l.qty, 0);

function setQty(id, qty) {
  const p = products.find((x) => x.id == id);
  if (!p) return;
  qty = Math.min(qty, p.stock_quantity);
  if (qty <= 0) delete cart[id]; else cart[id] = qty;
  renderCart();
}

function renderCart() {
  save();
  const lines = cartLines();
  $('#cartCount').textContent = lines.reduce((s, l) => s + l.qty, 0);
  $('#cartTotal').textContent = brl(total());
  $('#cartItems').innerHTML = lines.length ? lines.map(({ p, qty }) => `
    <div class="line">
      <div><div class="nm">${esc(p.name)}</div><div class="sub">${brl(p.price_per_day)} × ${qty} = ${brl(p.price_per_day * qty)}</div></div>
      <div class="qty"><button data-dec="${p.id}" aria-label="Diminuir">−</button><span>${qty}</span><button data-inc="${p.id}" aria-label="Aumentar">+</button></div>
      <span></span><button class="rm" data-rm="${p.id}">Remover</button>
    </div>`).join('') : '<p class="empty">Seu carrinho está vazio. Adicione peças do catálogo.</p>';
}

const toggleCart = (on) => { $('#cart').classList.toggle('on', on); $('#overlay').classList.toggle('on', on); };

document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.dataset.add) { setQty(t.dataset.add, (cart[t.dataset.add] || 0) + 1); toggleCart(true); }
  else if (t.dataset.inc) setQty(t.dataset.inc, (cart[t.dataset.inc] || 0) + 1);
  else if (t.dataset.dec) setQty(t.dataset.dec, (cart[t.dataset.dec] || 0) - 1);
  else if (t.dataset.rm) setQty(t.dataset.rm, 0);
});
$('#openCart').onclick = () => toggleCart(true);
$('#closeCart').onclick = $('#overlay').onclick = () => toggleCart(false);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleCart(false); });

// ---------- Finalização: salva no banco e abre o WhatsApp ----------
$('#orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#msg'); msg.textContent = '';
  const name = $('#cName').value.trim(), phone = $('#cPhone').value.trim(), date = $('#cDate').value;
  const lines = cartLines();

  if (!lines.length) return (msg.textContent = 'Adicione ao menos uma peça ao carrinho.');
  if (!name) return (msg.textContent = 'Informe seu nome.');
  if (phone.replace(/\D/g, '').length < 10) return (msg.textContent = 'Informe o telefone com DDD.');
  if (!date) return (msg.textContent = 'Informe a data do evento.');

  // Abre a janela antes do await para o navegador não bloquear o pop-up
  const win = window.open('', '_blank');
  try {
    const order = await api('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: name, customer_phone: phone, event_date: date,
        items: lines.map((l) => ({ product_id: l.p.id, quantity: l.qty })),
      }),
    });

    const [y, m, d] = date.split('-');
    const text = [
      `*Pedido #${order.id} - Mesa Pronta*`, '',
      `Nome: ${name}`, `Telefone: ${phone}`, `Data do evento: ${d}/${m}/${y}`, '',
      '*Itens:*',
      ...lines.map((l) => `• ${l.qty}x ${l.p.name} - ${brl(l.p.price_per_day * l.qty)}`),
      '', `*Total estimado (diária): ${brl(order.total_amount)}*`, '',
      'Frete calculado à parte. Aguardo a confirmação de disponibilidade.',
    ].join('\n');

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    if (win) win.location.href = url; else window.location.href = url;

    cart = {}; renderCart(); toggleCart(false); e.target.reset();
  } catch (err) {
    if (win) win.close();
    msg.textContent = err.message;
  }
});

// ---------- Calculadora de quantidade ideal ----------
// Valores por convidado (ajuste conforme a realidade da loja)
const RULES = {
  jantar:   { pratos: 2,   talheres: 3, copos: 2,   nota: 'Prato raso e de sobremesa, garfo, faca e colher, copo e taça.' },
  coquetel: { pratos: 2,   talheres: 1, copos: 3,   nota: 'Pratos pequenos, um garfo por pessoa e reposição de copos.' },
  infantil: { pratos: 1.5, talheres: 1, copos: 2,   nota: 'Prato, garfo e copos para suco e refrigerante.' },
};
$('#calcForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const n = Math.max(1, parseInt($('#guests').value, 10) || 0);
  const r = RULES[$('#evType').value];
  const q = (per) => Math.ceil(n * per * 1.1); // +10% de margem
  $('#calcOut').innerHTML = [['Pratos', r.pratos], ['Talheres', r.talheres], ['Copos e taças', r.copos]]
    .map(([l, per]) => `<div><strong>${q(per)}</strong>${l}</div>`).join('');
  $('#calcNote').textContent = `${r.nota} Para ${n} convidados, com 10% de margem. Adicione as peças pelo catálogo.`;
});

init();
