const WHATSAPP = '526142832898';
const DEFAULT_SIZES = Array.from({ length: 11 }, (_, index) => 22 + index);

function normalizeInventoryText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyProductName(value) {
  return normalizeInventoryText(value).replace(/\s+/g, '-');
}

function parseInventorySizeQuantities(sizeDetails, fallbackSizeValue = '') {
  const details = sizeDetails && typeof sizeDetails === 'object' ? sizeDetails : {};
  const entries = Object.entries(details)
    .map(([size, qty]) => [String(size), Number(qty)])
    .filter(([size, qty]) => Number.isFinite(Number(size)) && Number.isFinite(qty) && qty > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  if (entries.length) {
    return Object.fromEntries(entries.map(([size, qty]) => [size, Math.floor(qty)]));
  }

  const legacySizes = String(fallbackSizeValue || '')
    .split(',')
    .map(item => item.trim())
    .filter(item => /^\d+$/.test(item));

  const quantities = {};
  legacySizes.forEach(size => {
    quantities[size] = (quantities[size] || 0) + 1;
  });
  return quantities;
}

function getInventoryRowSizes(row) {
  return Object.entries(parseInventorySizeQuantities(row?.sizeDetails, row?.size))
    .filter(([, qty]) => Number(qty) > 0)
    .map(([size]) => Number(size))
    .filter(size => Number.isFinite(size))
    .sort((a, b) => a - b);
}

function loadInventoryCatalogState() {
  return window.INVENTORY_SITE_DATA?.data || null;
}

function buildInventoryProducts() {
  const inventoryState = loadInventoryCatalogState();
  const grouped = new Map();

  (inventoryState?.rows || []).forEach(row => {
    if (row?.productGroup !== 'tenis') return;

    const model = String(row?.model || '').trim();
    const sizes = getInventoryRowSizes(row);
    if (!model || !sizes.length) return;

    const key = normalizeInventoryText(model);
    if (!key) return;

    const existing = grouped.get(key) || {
      slug: `tenis-${slugifyProductName(model) || 'modelo'}`,
      name: `Tenis de Seguridad Modelo ${model}`,
      shortName: model,
      category: 'tenis',
      price: 0,
      old: null,
      specs: ['Tallas activas', 'Inventario local'],
      sale: false,
      image: null,
      sizes: [],
      description: `Tenis de seguridad modelo ${model} disponible en tienda.`,
      details: [
        `Modelo ${model} con tallas activas sujetas a disponibilidad.`,
        'Seleccion de tallas tomada del inventario actual de tienda.',
        'Confirma existencia por WhatsApp antes de apartar.'
      ],
      gallery: ['Vista principal', 'Perfil lateral', 'Tallas disponibles'],
      source: 'inventory'
    };

    const mergedSizes = Array.from(new Set([...(existing.sizes || []), ...sizes])).sort((a, b) => a - b);
    const salePrice = Number(row?.salePrice || 0);

    grouped.set(key, {
      ...existing,
      price: salePrice > 0 ? salePrice : existing.price,
      sizes: mergedSizes
    });
  });

  return Array.from(grouped.values())
    .filter(product => product.sizes.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'es-MX'));
}

function buildCatalogProducts() {
  const inventoryProducts = buildInventoryProducts();
  if (!inventoryProducts.length) {
    return staticProducts;
  }

  const staticNonTenis = staticProducts.filter(product => product.category !== 'tenis');
  return [...inventoryProducts, ...staticNonTenis];
}


const staticProducts = [
  {
    slug: 'tenis-modelo-021',
    name: 'Tenis de Seguridad Modelo 021',
    shortName: 'Modelo 021',
    category: 'tenis',
    price: 850,
    old: null,
    specs: ['Casco', 'Antiderrapante', 'Ligero'],
    sale: false,
    image: null,
    sizes: DEFAULT_SIZES,
    description: 'Tenis de seguridad ligero para trabajo diario, pensado para jornadas largas con buena estabilidad y comodidad.',
    details: [
      'Diseno comodo para uso continuo.',
      'Suela con buen agarre para piso de taller y almacen.',
      'Estructura resistente para trabajo operativo.'
    ],
    gallery: ['Vista principal', 'Perfil lateral', 'Suela y traccion']
  },
  {
    slug: 'tenis-modelo-030',
    name: 'Tenis de Seguridad Modelo 030',
    shortName: 'Modelo 030',
    category: 'tenis',
    price: 780,
    old: null,
    specs: ['Dielectrico', 'Antifatiga', 'NOM'],
    sale: false,
    image: null,
    sizes: DEFAULT_SIZES,
    description: 'Modelo deportivo con enfoque en proteccion electrica y soporte para actividades de planta y operacion ligera.',
    details: [
      'Construccion enfocada en seguridad industrial.',
      'Buena respuesta para trayectos largos dentro de planta.',
      'Facil de combinar con uniforme de trabajo.'
    ],
    gallery: ['Frente', 'Lateral', 'Detalle del casco']
  },
  {
    slug: 'tenis-modelo-maxi',
    name: 'Tenis de Seguridad Modelo Maxi',
    shortName: 'Modelo Maxi',
    category: 'tenis',
    price: 750,
    old: 1200,
    specs: ['Casco poliamida', 'Ligero', 'Confort'],
    sale: true,
    image: null,
    sizes: DEFAULT_SIZES,
    description: 'Tenis industrial con sensacion mas ligera y construccion pensada para confort durante el turno completo.',
    details: [
      'Casco de poliamida en un perfil discreto.',
      'Ideal para quien busca una silueta menos robusta.',
      'Opcion comoda para uso diario.'
    ],
    gallery: ['Vista principal', 'Costado', 'Zona del talon']
  },
  {
    slug: 'tenis-modelo-xport',
    name: 'Tenis de Seguridad Modelo Xport',
    shortName: 'Modelo Xport',
    category: 'tenis',
    price: 590,
    old: 1050,
    specs: ['Industrial', 'Antiderrapante', 'Oferta'],
    sale: true,
    image: null,
    sizes: DEFAULT_SIZES,
    description: 'Alternativa accesible para operacion general con buena traccion y una imagen deportiva.',
    details: [
      'Precio competitivo en catalogo.',
      'Buen agarre para zonas de alto movimiento.',
      'Pensado para uso practico y diario.'
    ],
    gallery: ['Frente', 'Perfil', 'Detalle de suela']
  },
  {
    slug: 'tenis-ultra-protect',
    name: 'Tenis Ultra Protect',
    shortName: 'Ultra Protect',
    category: 'tenis',
    price: 750,
    old: null,
    specs: ['Ultra ligero', 'Antifatiga', 'Casco'],
    sale: false,
    image: null,
    sizes: DEFAULT_SIZES,
    description: 'Tenis de seguridad orientado a ligereza y movilidad para quienes pasan muchas horas caminando.',
    details: [
      'Perfil ligero con buena sensacion al caminar.',
      'Pensado para reducir cansancio durante la jornada.',
      'Buena opcion para almacen y supervision.'
    ],
    gallery: ['Vista principal', 'Lateral', 'Interior']
  },
  {
    slug: 'bota-raptor',
    name: 'Bota de Seguridad Modelo Raptor',
    shortName: 'Modelo Raptor',
    category: 'botas',
    price: 980,
    old: null,
    specs: ['Trabajo pesado', 'Resistente', 'Casco'],
    sale: false,
    image: null,
    sizes: DEFAULT_SIZES,
    description: 'Bota de seguridad para trabajo rudo con estructura firme y soporte para entornos de mayor exigencia.',
    details: [
      'Ideal para actividades de obra, patio y manejo de material.',
      'Diseno robusto para condiciones demandantes.',
      'Ajuste alto con mayor sensacion de soporte.'
    ],
    gallery: ['Vista principal', 'Perfil lateral', 'Detalle de suela']
  },
  {
    slug: 'bota-soldador',
    name: 'Bota de Seguridad Modelo Soldador',
    shortName: 'Modelo Soldador',
    category: 'botas',
    price: 780,
    old: null,
    specs: ['Soldador', 'Piel', 'Proteccion'],
    sale: false,
    image: null,
    sizes: DEFAULT_SIZES,
    description: 'Bota pensada para labores de soldadura y procesos donde se necesita un perfil mas cubierto y resistente.',
    details: [
      'Construccion enfocada en seguridad y cobertura.',
      'Materiales resistentes para trabajo industrial.',
      'Perfil clasico de bota de taller.'
    ],
    gallery: ['Frente', 'Costado', 'Detalle superior']
  },
  {
    slug: 'bota-modelo-501',
    name: 'Botas de Seguridad Modelo 501',
    shortName: 'Modelo 501',
    category: 'botas',
    price: 480,
    old: null,
    specs: ['Economica', 'Industrial', 'Resistente'],
    sale: false,
    image: null,
    sizes: DEFAULT_SIZES,
    description: 'Modelo de entrada para necesidades operativas basicas, manteniendo una presentacion resistente y funcional.',
    details: [
      'Opcion economica para surtido general.',
      'Pensada para uso operativo basico.',
      'Buena alternativa para compras por volumen.'
    ],
    gallery: ['Vista principal', 'Lateral', 'Base']
  },
  {
    slug: 'bota-tactica-industrial',
    name: 'Bota Tactica Industrial',
    shortName: 'Tactica Industrial',
    category: 'botas',
    price: 1050,
    old: null,
    specs: ['Tactica', 'Trabajo', 'Alta traccion'],
    sale: false,
    image: null,
    sizes: DEFAULT_SIZES,
    description: 'Bota con presencia tactica y suela de buena traccion para trabajo operativo que requiere mayor soporte al tobillo.',
    details: [
      'Silueta alta con imagen firme.',
      'Pensada para exterior, patio y recorridos largos.',
      'Buena estabilidad en movimiento.'
    ],
    gallery: ['Frente', 'Perfil', 'Detalle de traccion']
  }
];

const products = buildCatalogProducts();

const productsEl = document.getElementById('products');
const searchEl = document.getElementById('search');
const categoryEl = document.getElementById('category');
const sortEl = document.getElementById('sort');
const clearEl = document.getElementById('clearFilters');
const yearEl = document.getElementById('year');
const detailRootEl = document.getElementById('product-detail');
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

function getCategoryLabel(category) {
  return category === 'botas' ? 'Botas de Seguridad' : 'Tenis de Seguridad';
}

function getCategoryUrl(category) {
  return category === 'botas' ? 'botas-seguridad.html' : 'tenis-seguridad.html';
}

function getProductImageMarkup(product, extraClass = '') {
  if (product.image) {
    return `<img class="${extraClass}" src="${product.image}" alt="${product.name}" loading="lazy">`;
  }

  return shoeSVG(product.category);
}

function renderProducts() {
  if (!productsEl) return;

  const term = searchEl ? searchEl.value.toLowerCase().trim() : '';
  const cat = categoryEl ? categoryEl.value : pageCategory;
  const sort = sortEl ? sortEl.value : 'default';

  let list = products.filter(product => {
    const matchesPage = pageCategory === 'todos' || product.category === pageCategory || (pageCategory === 'botas' && product.category === 'tactico');
    const matchesTerm = [product.name, product.category, ...product.specs].join(' ').toLowerCase().includes(term);
    const matchesCat = cat === 'todos' || product.category === cat || (cat === 'botas' && product.category === 'tactico');
    return matchesPage && matchesTerm && matchesCat;
  });

  if (sort === 'default' && pageCategory === 'tenis') list.sort((a, b) => a.name.localeCompare(b.name, 'es-MX'));
  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'es-MX'));

  productsEl.innerHTML = list.map(product => {
    const sizes = product.sizes && product.sizes.length ? product.sizes : DEFAULT_SIZES;

    return `
      <a class="product product-link" href="producto.html?slug=${product.slug}" aria-label="Ver detalle de ${product.name}">
        <div class="product-img">${product.sale ? '<span class="sale">Oferta</span>' : ''}${getProductImageMarkup(product)}</div>
        <div class="product-body">
          <div class="product-copy">
            <h3>${product.name}</h3>
            <div class="specs">${product.specs.map(spec => `<span>${spec}</span>`).join('')}</div>
            <div class="price"><strong>$${product.price.toLocaleString('es-MX')}.00</strong>${product.old ? `<small>$${product.old.toLocaleString('es-MX')}.00</small>` : ''}</div>
            <div class="sizes-block">
              <p>Tallas disponibles</p>
              <div class="sizes">${sizes.map(size => `<span>${size}</span>`).join('')}</div>
            </div>
          </div>
          <div class="product-actions product-actions-corner">
            <span class="product-card-cta">Ver detalle</span>
          </div>
        </div>
      </a>`;
  }).join('') || '<p>No hay productos con esos filtros.</p>';
}

function renderProductDetail() {
  if (!detailRootEl) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const product = products.find(item => item.slug === slug);

  if (!product) {
    detailRootEl.innerHTML = `
      <section class="section">
        <div class="container detail-empty">
          <h2>Producto no encontrado</h2>
          <p>Regresa al catalogo para elegir un modelo valido.</p>
          <a class="btn btn-primary" href="index.html">Ir al inicio</a>
        </div>
      </section>`;
    return;
  }

  document.title = `${product.name} | Zapateria Chihuahua`;

  const sizes = product.sizes && product.sizes.length ? product.sizes : DEFAULT_SIZES;
  const whatsappText = encodeURIComponent(`Hola, quiero informacion sobre ${product.name}.`);

  detailRootEl.innerHTML = `
    <section class="section product-detail-page">
      <div class="container">
        <div class="detail-toolbar">
          <a class="btn btn-outline btn-back" href="${getCategoryUrl(product.category)}">Volver atras</a>
        </div>

        <article class="detail-layout">
          <div class="detail-visuals">
            <div class="detail-main-visual">
              ${getProductImageMarkup(product, 'detail-main-image')}
            </div>
            <div class="detail-gallery">
              ${product.gallery.map(label => `
                <div class="detail-thumb">
                  <div class="detail-thumb-media">${getProductImageMarkup(product)}</div>
                  <span>${label}</span>
                </div>`).join('')}
            </div>
          </div>

          <div class="detail-info">
            <span class="detail-category">${getCategoryLabel(product.category)}</span>
            <h2>${product.name}</h2>
            <p class="detail-description">${product.description}</p>

            <div class="detail-price">
              <strong>$${product.price.toLocaleString('es-MX')}.00</strong>
              ${product.old ? `<small>$${product.old.toLocaleString('es-MX')}.00</small>` : ''}
            </div>

            <div class="specs">${product.specs.map(spec => `<span>${spec}</span>`).join('')}</div>

            <section class="detail-card">
              <h3>Tallas disponibles</h3>
              <div class="sizes">${sizes.map(size => `<span>${size}</span>`).join('')}</div>
            </section>

            <section class="detail-card">
              <h3>Descripcion</h3>
              <ul class="detail-list">
                ${product.details.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </section>

            <div class="detail-actions">
              <a class="btn btn-primary" href="https://wa.me/${WHATSAPP}?text=${whatsappText}" target="_blank" rel="noopener">Pedir por WhatsApp</a>
              <a class="btn btn-outline" href="${getCategoryUrl(product.category)}">Volver al catalogo</a>
            </div>
          </div>
        </article>
      </div>
    </section>`;
}

[searchEl, categoryEl, sortEl].forEach(element => {
  if (element) element.addEventListener('input', renderProducts);
});

if (clearEl) {
  clearEl.addEventListener('click', () => {
    if (searchEl) searchEl.value = '';
    if (categoryEl) categoryEl.value = pageCategory === 'todos' ? 'todos' : pageCategory;
    if (sortEl) sortEl.value = 'default';
    renderProducts();
  });
}

if (yearEl) yearEl.textContent = new Date().getFullYear();

renderProducts();
renderProductDetail();
