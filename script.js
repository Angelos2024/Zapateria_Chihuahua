
const WHATSAPP = '526521926845';

const products = [
  { name: 'Tenis de Seguridad Modelo 021', category: 'tenis', price: 850, old: null, specs: ['Casco', 'Antiderrapante', 'Ligero'], sale: false },
  { name: 'Tenis de Seguridad Modelo 030', category: 'tenis', price: 780, old: null, specs: ['Dieléctrico', 'Antifatiga', 'NOM'], sale: false },
  { name: 'Tenis de Seguridad Modelo Maxi', category: 'tenis', price: 750, old: 1200, specs: ['Casco poliamida', 'Ligero', 'Confort'], sale: true },
  { name: 'Tenis de Seguridad Modelo Xport', category: 'tenis', price: 590, old: 1050, specs: ['Industrial', 'Antiderrapante', 'Oferta'], sale: true },
  { name: 'Tenis Ultra Protect', category: 'tenis', price: 750, old: null, specs: ['Ultra ligero', 'Antifatiga', 'Casco'], sale: false },

  { name: 'Bota de Seguridad Modelo Raptor', category: 'botas', price: 980, old: null, specs: ['Trabajo pesado', 'Resistente', 'Casco'], sale: false },
  { name: 'Bota de Seguridad Modelo Soldador', category: 'botas', price: 780, old: null, specs: ['Soldador', 'Piel', 'Protección'], sale: false },
  { name: 'Botas de Seguridad Modelo 501', category: 'botas', price: 480, old: null, specs: ['Económica', 'Industrial', 'Resistente'], sale: false },
  { name: 'Bota Táctica Industrial', category: 'botas', price: 1050, old: null, specs: ['Táctica', 'Trabajo', 'Alta tracción'], sale: false }
];

const productsEl = document.getElementById('products');
const searchEl = document.getElementById('search');
const categoryEl = document.getElementById('category');
const sortEl = document.getElementById('sort');
const clearEl = document.getElementById('clearFilters');
const pageCategory = document.body.dataset.pageCategory || 'todos';

function shoeSVG(category) {
  const boot = category === 'botas' || category === 'tactico';
  return `
  <svg viewBox="0 0 420 220" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Producto de calzado">
    <path d="M54 142c42 4 78-4 110-26 23-16 37-37 53-65h70c9 39 13 69 37 82 23 13 61 20 83 34 14 9 13 33-4 38H78c-32 0-54-28-24-63Z" fill="#111"/>
    <path d="M52 149c61 15 110 2 150-31 20-16 35-37 48-63h35c8 32 14 61 39 76 22 13 58 20 80 34" stroke="#f7c600" stroke-width="14" stroke-linecap="round"/>
    ${boot ? '<path d="M210 51h86l19 78h-87c-9-32-14-52-18-78Z" fill="#2c2c2c"/><path d="M228 69h55" stroke="#f7c600" stroke-width="8" stroke-linecap="round"/>' : '<path d="M158 119c42 11 88 9 143-6" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".72"/>'}
    <path d="M78 190h311" stroke="#c62828" stroke-width="14" stroke-linecap="round"/>
  </svg>`;
}

function renderProducts() {
  if (!productsEl) return;

  const term = searchEl ? searchEl.value.toLowerCase().trim() : '';
  const cat = categoryEl ? categoryEl.value : pageCategory;
  const sort = sortEl ? sortEl.value : 'default';

  let list = products.filter(p => {
    const matchesPage = pageCategory === 'todos' || p.category === pageCategory || (pageCategory === 'botas' && p.category === 'tactico');
    const matchesTerm = [p.name, p.category, ...p.specs].join(' ').toLowerCase().includes(term);
    const matchesCat = cat === 'todos' || p.category === cat || (cat === 'botas' && p.category === 'tactico');
    return matchesPage && matchesTerm && matchesCat;
  });

  if (sort === 'price-asc') list.sort((a,b) => a.price - b.price);
  if (sort === 'price-desc') list.sort((a,b) => b.price - a.price);
  if (sort === 'name') list.sort((a,b) => a.name.localeCompare(b.name));

  productsEl.innerHTML = list.map(p => {
    const msg = encodeURIComponent(`Hola, quiero información sobre ${p.name}. ¿Tienen talla disponible?`);
    return `
      <article class="product">
        <div class="product-img">${p.sale ? '<span class="sale">Oferta</span>' : ''}${shoeSVG(p.category)}</div>
        <div class="product-body">
          <h3>${p.name}</h3>
          <div class="specs">${p.specs.map(s => `<span>${s}</span>`).join('')}</div>
          <div class="price"><strong>$${p.price.toLocaleString('es-MX')}.00</strong>${p.old ? `<small>$${p.old.toLocaleString('es-MX')}.00</small>` : ''}</div>
          <div class="product-actions">
            <a class="btn btn-primary" href="https://wa.me/${WHATSAPP}?text=${msg}" target="_blank" rel="noopener">Pedir talla</a>
            <a class="btn btn-outline" href="index.html#ubicacion">Ver tienda</a>
          </div>
        </div>
      </article>`;
  }).join('') || `<p>No hay productos con esos filtros.</p>`;
}

[searchEl, categoryEl, sortEl].forEach(el => {
  if (el) el.addEventListener('input', renderProducts);
});

if (clearEl) {
  clearEl.addEventListener('click', () => {
    if (searchEl) searchEl.value = '';
    if (categoryEl) categoryEl.value = pageCategory === 'todos' ? 'todos' : pageCategory;
    if (sortEl) sortEl.value = 'default';
    renderProducts();
  });
}

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

renderProducts();
