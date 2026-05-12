const WHATSAPP = '526142832898';
const DEFAULT_SIZES = Array.from({ length: 11 }, (_, index) => 22 + index);
const ADMIN_PASSWORD = 'skytahor';
const PRODUCT_ADMIN_STORAGE_KEY = 'zapateria_chihuahua_product_admin_v1';
const PRODUCT_ADMIN_SYNC_URL = 'http://127.0.0.1:45126/api/product-admin-state';
const PRODUCT_ADMIN_SAVE_TIMEOUT_MS = 12000;

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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStoredProductAdminState() {
  const fileState = window.PRODUCT_ADMIN_DATA?.products;
  if (fileState && typeof fileState === 'object') {
    return fileState;
  }

  try {
    const raw = window.localStorage.getItem(PRODUCT_ADMIN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function setAdminSaveStatus(message, isError = false) {
  const status = document.getElementById('admin-save-status');
  if (!status) return;
  status.textContent = message || '';
  status.classList.toggle('is-error', Boolean(isError));
}

function canWriteProductAdminFiles() {
  return window.location.protocol === 'http:' || window.location.protocol === 'https:';
}

async function saveProductAdminState(state) {
  if (!canWriteProductAdminFiles()) {
    setAdminSaveStatus('Abre la pagina desde el servidor local: http://127.0.0.1:45126/Zapateria_Chihuahua/botas-seguridad.html', true);
    return null;
  }

  const payload = {
    savedAt: new Date().toISOString(),
    source: 'product-admin',
    products: state || {}
  };

  window.PRODUCT_ADMIN_DATA = payload;
  window.localStorage.setItem(PRODUCT_ADMIN_STORAGE_KEY, JSON.stringify(state || {}));

  let timeoutId = null;
  try {
    const controller = new AbortController();
    timeoutId = window.setTimeout(() => controller.abort(), PRODUCT_ADMIN_SAVE_TIMEOUT_MS);
    const response = await window.fetch(PRODUCT_ADMIN_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    window.clearTimeout(timeoutId);

    const result = await response.json();
    if (!response.ok || !result?.ok) throw new Error('No se pudo guardar.');
    if (result.data?.products) {
      window.PRODUCT_ADMIN_DATA = result.data;
      window.localStorage.setItem(PRODUCT_ADMIN_STORAGE_KEY, JSON.stringify(result.data.products));
    }
    setAdminSaveStatus('Guardado en product-admin-data.js e img/productos.');
    return result.data?.products || state || {};
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'El guardado tardo demasiado. Revisa el tamano de las fotos o vuelve a intentar desde http://127.0.0.1:45126.'
      : 'No se pudo guardar. Verifica que ejecutar-zapateria-local.bat este abierto y vuelve a intentar.';
    setAdminSaveStatus(message, true);
    return null;
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

function getProductAdminKey(product) {
  return product.adminKey || product.slug;
}

function getProductAdminAliases(product) {
  const aliases = [];
  if (product.legacyAdminKey) aliases.push(product.legacyAdminKey);
  if (product.slug) aliases.push(product.slug);
  return aliases.filter(Boolean);
}

function getSizeRange(minSize, maxSize) {
  const min = Number(minSize);
  const max = Number(maxSize);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return [];
  return DEFAULT_SIZES.filter(size => size >= min && size <= max);
}

function getManufacturedSizeRange(meta, stockSizes) {
  const hasMin = Number.isFinite(Number(meta?.minSize));
  const hasMax = Number.isFinite(Number(meta?.maxSize));
  if (!hasMin && !hasMax) return [];

  const fallbackMin = Math.min(...stockSizes);
  const fallbackMax = Math.max(...stockSizes);
  const minSize = hasMin ? Number(meta.minSize) : fallbackMin;
  const maxSize = hasMax ? Number(meta.maxSize) : fallbackMax;
  return getSizeRange(minSize, maxSize);
}

function normalizeProductImages(meta, fallbackImage = null) {
  const images = Array.isArray(meta?.images) ? meta.images : [];
  const normalized = images
    .concat(meta?.image ? [meta.image] : [])
    .filter(image => typeof image === 'string' && image.trim())
    .map(image => image.trim());

  if (!normalized.length && fallbackImage) {
    normalized.push(fallbackImage);
  }

  return Array.from(new Set(normalized));
}

function getProductCoverImage(meta, images) {
  const coverImage = typeof meta?.coverImage === 'string' ? meta.coverImage.trim() : '';
  return images.includes(coverImage) ? coverImage : images[0] || '';
}

function normalizeProductDetails(value, fallbackDetails = []) {
  if (Array.isArray(value)) {
    const details = value
      .map(item => String(item || '').trim())
      .filter(Boolean);
    return details.length ? details : fallbackDetails;
  }

  if (typeof value === 'string') {
    const details = value
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
    return details.length ? details : fallbackDetails;
  }

  return fallbackDetails;
}

function applyProductAdminState(productList) {
  const adminState = getStoredProductAdminState();

  return productList.map(product => {
    const key = getProductAdminKey(product);
    const meta = adminState[key] || getProductAdminAliases(product)
      .map(alias => adminState[alias])
      .find(Boolean) || {};
    const currentSizes = product.sizes && product.sizes.length ? product.sizes : DEFAULT_SIZES;
    const manufacturedSizes = getManufacturedSizeRange(meta, currentSizes);
    const images = normalizeProductImages(meta, product.image);
    const coverImage = getProductCoverImage(meta, images);

    return {
      ...product,
      image: coverImage || null,
      images,
      coverImage,
      description: typeof meta.description === 'string' && meta.description.trim()
        ? meta.description.trim()
        : product.description,
      details: normalizeProductDetails(meta.details, product.details || []),
      manufacturedSizes: manufacturedSizes.length ? manufacturedSizes : currentSizes,
      adminMeta: meta
    };
  });
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
    const productGroup = String(row?.productGroup || '').trim();
    const category = productGroup === 'tenis' ? 'tenis' : 'botas';
    const categoryLabel = category === 'tenis' ? 'Tenis de Seguridad' : 'Calzado de Seguridad';

    const model = String(row?.model || '').trim();
    const sizes = getInventoryRowSizes(row);
    if (!model || !sizes.length) return;

    const normalizedModel = normalizeInventoryText(model);
    const key = `${category}:${normalizedModel}`;
    if (!key) return;

    const existing = grouped.get(key) || {
      slug: `${category}-${slugifyProductName(model) || 'modelo'}`,
      name: `${categoryLabel} Modelo ${model}`,
      shortName: model,
      category,
      price: 0,
      old: null,
      specs: ['Tallas activas', productGroup === 'calzado-vaquero' ? 'Vaquero' : 'Inventario local'],
      sale: false,
      image: null,
      sizes: [],
      manufacturedSizes: [],
      adminKey: `inventory:${key}`,
      description: `${categoryLabel} modelo ${model} disponible en tienda.`,
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
    return applyProductAdminState(staticProducts);
  }

  const inventoryCategories = new Set(inventoryProducts.map(product => product.category));
  const staticFallbackProducts = staticProducts.filter(product => !inventoryCategories.has(product.category));
  return applyProductAdminState([...inventoryProducts, ...staticFallbackProducts]);
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
const hasInventoryProducts = products.some(product => product.source === 'inventory');

const productsEl = document.getElementById('products');
const searchEl = document.getElementById('search');
const categoryEl = document.getElementById('category');
const sizeEl = document.getElementById('sizeFilter');
const sortEl = document.getElementById('sort');
const clearEl = document.getElementById('clearFilters');
const activeFilterChipsEl = document.getElementById('activeFilterChips');
const yearEl = document.getElementById('year');
const detailRootEl = document.getElementById('product-detail');
const pageCategory = document.body.dataset.pageCategory || 'todos';
const filtersEl = document.querySelector('.filters');
const filtersTriggerEl = document.querySelector('.filters-mobile-trigger');
const filtersCloseEls = Array.from(document.querySelectorAll('[data-close-filters]'));
const mobileFiltersMedia = window.matchMedia('(max-width: 980px)');
const mobileNavEl = document.querySelector('.site-nav');
const mobileNavToggleEl = document.querySelector('.menu-toggle');
const mobileNavMedia = window.matchMedia('(max-width: 991px)');

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

function getCategoryMatch(category, activePageCategory = pageCategory) {
  if (activePageCategory === 'todos') return true;
  if (activePageCategory === 'botas') return category === 'botas' || category === 'tactico';
  return category === activePageCategory;
}

function getCatalogUrlParams() {
  return new URLSearchParams(window.location.search);
}

function getSelectedSizeValue() {
  const value = sizeEl ? String(sizeEl.value || '').trim() : '';
  return /^\d+$/.test(value) ? value : '';
}

function normalizeSizeList(sizes) {
  return Array.from(new Set((sizes || [])
    .map(size => Number(size))
    .filter(size => Number.isFinite(size)))).sort((a, b) => a - b);
}

function getFilterableStockSizes(product) {
  const explicitSizes = normalizeSizeList(product?.sizes);
  if (explicitSizes.length) return explicitSizes;
  return hasInventoryProducts ? [] : DEFAULT_SIZES;
}

function isSizeFilterActive() {
  return Boolean(getSelectedSizeValue());
}

function syncCategoryFilterState() {
  if (!categoryEl) return;

  const sizeFilterActive = isSizeFilterActive();
  categoryEl.disabled = sizeFilterActive;
  categoryEl.title = sizeFilterActive ? 'La categoria se ignora cuando filtras por talla.' : '';
}

function getCatalogVisibleSizes(activePageCategory = 'todos') {
  const sizeSet = new Set();

  products.forEach(product => {
    if (!getCategoryMatch(product.category, activePageCategory)) return;
    getFilterableStockSizes(product).forEach(size => {
      const numericSize = Number(size);
      if (Number.isFinite(numericSize)) sizeSet.add(String(numericSize));
    });
  });

  return Array.from(sizeSet).sort((a, b) => Number(a) - Number(b));
}

function populateSizeFilterOptions() {
  if (!sizeEl) return;

  const currentValue = getSelectedSizeValue() || getCatalogUrlParams().get('talla') || '';
  const sizes = getCatalogVisibleSizes('todos');
  sizeEl.innerHTML = [
    '<option value="">Todas las tallas</option>',
    ...sizes.map(size => `<option value="${escapeHtml(size)}">Talla ${escapeHtml(size)}</option>`)
  ].join('');

  if (currentValue && sizes.includes(String(currentValue))) {
    sizeEl.value = String(currentValue);
  } else {
    sizeEl.value = '';
  }
}

function applyCatalogFiltersFromUrl() {
  const params = getCatalogUrlParams();
  const sizeParam = String(params.get('talla') || '').trim();
  const sortParam = String(params.get('orden') || '').trim();

  if (sizeEl) {
    sizeEl.value = /^\d+$/.test(sizeParam) ? sizeParam : '';
  }

  if (sortEl && ['default', 'price-asc', 'price-desc', 'name'].includes(sortParam)) {
    sortEl.value = sortParam;
  }
}

function syncCatalogFiltersToUrl() {
  if (!productsEl) return;

  const params = new URLSearchParams();
  const selectedSize = getSelectedSizeValue();
  const selectedSort = sortEl ? sortEl.value : 'default';

  if (selectedSize) params.set('talla', selectedSize);
  if (selectedSort && selectedSort !== 'default') params.set('orden', selectedSort);

  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
  window.history.replaceState({}, '', nextUrl);
}

function buildCategoryNavigationUrl(category) {
  const params = new URLSearchParams();
  const selectedSize = getSelectedSizeValue();
  const selectedSort = sortEl ? sortEl.value : 'default';

  if (selectedSize) params.set('talla', selectedSize);
  if (selectedSort && selectedSort !== 'default') params.set('orden', selectedSort);

  const baseUrl = getCategoryUrl(category);
  return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
}

function getSortLabel(value) {
  switch (value) {
    case 'price-asc':
      return 'Precio: menor a mayor';
    case 'price-desc':
      return 'Precio: mayor a menor';
    case 'name':
      return 'Nombre: A-Z';
    default:
      return '';
  }
}

function renderActiveFilterChips() {
  if (!activeFilterChipsEl) return;

  const chips = [];
  const selectedSize = getSelectedSizeValue();
  const selectedSort = sortEl ? sortEl.value : 'default';

  if (selectedSize) {
    chips.push({
      key: 'size',
      label: `Talla ${selectedSize}`
    });
  }

  if (selectedSort && selectedSort !== 'default') {
    chips.push({
      key: 'sort',
      label: getSortLabel(selectedSort)
    });
  }

  activeFilterChipsEl.innerHTML = chips.map(chip => `
    <span class="active-filter-chip">
      <span>${escapeHtml(chip.label)}</span>
      <button type="button" data-remove-filter="${escapeHtml(chip.key)}" aria-label="${escapeHtml(`Quitar filtro ${chip.label}`)}">x</button>
    </span>
  `).join('');

  activeFilterChipsEl.classList.toggle('has-items', chips.length > 0);
}

function installActiveFilterChipActions() {
  if (!activeFilterChipsEl) return;

  activeFilterChipsEl.addEventListener('click', event => {
    const trigger = event.target instanceof HTMLElement ? event.target.closest('[data-remove-filter]') : null;
    if (!(trigger instanceof HTMLElement)) return;

    const filterKey = trigger.dataset.removeFilter;
    if (filterKey === 'size' && sizeEl) {
      sizeEl.value = '';
    }

    if (filterKey === 'sort' && sortEl) {
      sortEl.value = 'default';
    }

    renderProducts();
  });
}

function getProductImageMarkup(product, extraClass = '') {
  if (product.image) {
    return `<img class="${extraClass}" src="${product.image}" alt="${product.name}" loading="lazy">`;
  }

  return shoeSVG(product.category);
}

function getProductImageList(product) {
  return product.images && product.images.length ? product.images : [];
}

function getProductGalleryMarkup(product) {
  const images = getProductImageList(product);
  if (images.length) {
    return images.map((image, index) => `
      <button class="detail-thumb ${index === 0 ? 'is-active' : ''}" type="button" aria-label="${escapeHtml(`Ver foto ${index + 1} de ${product.name}`)}" data-action="select-detail-image" data-image-src="${escapeHtml(image)}" data-image-alt="${escapeHtml(`${product.name} foto ${index + 1}`)}">
        <div class="detail-thumb-media"><img class="detail-thumb-image" src="${image}" alt="${product.name} foto ${index + 1}" loading="lazy"></div>
      </button>`).join('');
  }

  return product.gallery.map((label, index) => `
    <button class="detail-thumb ${index === 0 ? 'is-active' : ''}" type="button" aria-label="${escapeHtml(`Ver imagen ${index + 1} de ${product.name}`)}" data-action="select-detail-image" data-image-src="">
      <div class="detail-thumb-media">${getProductImageMarkup(product)}</div>
    </button>`).join('');
}

function getProductStockSizes(product) {
  return product.sizes && product.sizes.length ? product.sizes : DEFAULT_SIZES;
}

function getProductActiveSizeCount(product) {
  return getProductStockSizes(product).length;
}

function getProductManufacturedSizes(product) {
  return product.manufacturedSizes && product.manufacturedSizes.length
    ? product.manufacturedSizes
    : getProductStockSizes(product);
}

function renderSizeBadges(product) {
  return getProductStockSizes(product)
    .map(size => {
      const numericSize = Number(size);
      return `<span title="Disponible en tienda">${numericSize}</span>`;
    })
    .join('');
}

function getDetailImageThumbs() {
  return Array.from(document.querySelectorAll('.detail-thumb[data-image-src]'))
    .filter(thumb => thumb instanceof HTMLElement && thumb.dataset.imageSrc);
}

function selectDetailImageFromThumb(thumb) {
  if (!(thumb instanceof HTMLElement)) return;
  const imageSrc = thumb.dataset.imageSrc;
  const imageAlt = thumb.dataset.imageAlt || 'Producto de calzado';
  const mainVisual = document.querySelector('.detail-main-visual');
  if (!imageSrc || !mainVisual) return;

  mainVisual.innerHTML = `<img class="detail-main-image" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(imageAlt)}">`;
  document.querySelectorAll('.detail-thumb.is-active').forEach(item => {
    item.classList.remove('is-active');
  });
  thumb.classList.add('is-active');
}

function selectDetailImageByDirection(direction) {
  const thumbs = getDetailImageThumbs();
  if (thumbs.length < 2) return;

  const activeIndex = thumbs.findIndex(thumb => thumb.classList.contains('is-active'));
  const baseIndex = activeIndex >= 0 ? activeIndex : 0;
  const nextIndex = (baseIndex + direction + thumbs.length) % thumbs.length;
  selectDetailImageFromThumb(thumbs[nextIndex]);
}

function installDetailImageSwipe() {
  const mainVisual = document.querySelector('.detail-main-visual');
  const thumbs = getDetailImageThumbs();
  if (!mainVisual || thumbs.length < 2) return;

  let touchStartX = 0;
  let touchStartY = 0;

  mainVisual.addEventListener('touchstart', event => {
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  mainVisual.addEventListener('touchend', event => {
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const horizontalThreshold = 36;

    if (Math.abs(deltaX) < horizontalThreshold || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (deltaX < 0) {
      selectDetailImageByDirection(1);
      return;
    }

    selectDetailImageByDirection(-1);
  }, { passive: true });
}

function installDetailGalleryInteractions() {
  document.querySelectorAll('.detail-thumb[data-image-src]').forEach(thumb => {
    thumb.addEventListener('click', () => {
      selectDetailImageFromThumb(thumb);
    });
  });

  installDetailImageSwipe();
}

function renderProducts() {
  if (!productsEl) return;

  const term = searchEl ? searchEl.value.toLowerCase().trim() : '';
  const cat = categoryEl ? categoryEl.value : pageCategory;
  const selectedSize = getSelectedSizeValue();
  const ignoreCategoryFilter = Boolean(selectedSize);
  const sort = sortEl ? sortEl.value : 'default';

  let list = products.filter(product => {
    const matchesPage = ignoreCategoryFilter
      ? true
      : pageCategory === 'todos' || product.category === pageCategory || (pageCategory === 'botas' && product.category === 'tactico');
    const matchesTerm = [product.name, product.category, ...product.specs].join(' ').toLowerCase().includes(term);
    const matchesCat = ignoreCategoryFilter
      ? true
      : cat === 'todos' || product.category === cat || (cat === 'botas' && product.category === 'tactico');
    const matchesSize = !selectedSize || getFilterableStockSizes(product).includes(Number(selectedSize));
    return matchesPage && matchesTerm && matchesCat && matchesSize;
  });

  if (sort === 'default') {
    list.sort((a, b) => {
      const sizeDifference = getProductActiveSizeCount(b) - getProductActiveSizeCount(a);
      if (sizeDifference !== 0) return sizeDifference;
      return a.name.localeCompare(b.name, 'es-MX');
    });
  }
  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'es-MX'));

  productsEl.innerHTML = list.map(product => {
    return `
      <a class="product product-link" href="producto.html?slug=${product.slug}" aria-label="Ver detalle de ${product.name}">
        <div class="product-img">${product.sale ? '<span class="sale">Oferta</span>' : ''}${getProductImageMarkup(product)}</div>
        <div class="product-body">
          <div class="product-copy">
            <h3>${product.name}</h3>
            <div class="product-price-row">
              <div class="price"><strong>$${product.price.toLocaleString('es-MX')}.00</strong>${product.old ? `<small>$${product.old.toLocaleString('es-MX')}.00</small>` : ''}</div>
              <span class="product-card-cta">Ver detalle</span>
            </div>
            <div class="sizes-block">
              <p>Tallas disponibles</p>
              <div class="sizes">${renderSizeBadges(product)}</div>
            </div>
          </div>
        </div>
      </a>`;
  }).join('') || '<p>No hay productos con esos filtros.</p>';

  syncCategoryFilterState();
  renderActiveFilterChips();
  syncCatalogFiltersToUrl();
}

function installCategoryNavigation() {
  if (!categoryEl || pageCategory === 'todos') return;

  categoryEl.addEventListener('change', () => {
    const nextCategory = categoryEl.value;
    if (!nextCategory || nextCategory === pageCategory) {
      renderProducts();
      return;
    }

    window.location.href = buildCategoryNavigationUrl(nextCategory);
  });
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
              ${getProductGalleryMarkup(product)}
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

            <section class="detail-card">
              <h3>Tallas disponibles</h3>
              <div class="sizes">${renderSizeBadges(product)}</div>
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

  installDetailGalleryInteractions();
}

function isMobileFiltersViewport() {
  return mobileFiltersMedia.matches;
}

function isMobileNavViewport() {
  return mobileNavMedia.matches;
}

function closeMobileNav() {
  if (!mobileNavEl || !mobileNavToggleEl) return;
  document.body.classList.remove('mobile-nav-open');
  mobileNavToggleEl.setAttribute('aria-expanded', 'false');
}

function openMobileNav() {
  if (!mobileNavEl || !mobileNavToggleEl || !isMobileNavViewport()) return;
  document.body.classList.add('mobile-nav-open');
  mobileNavToggleEl.setAttribute('aria-expanded', 'true');
}

function installMobileNav() {
  if (!mobileNavEl || !mobileNavToggleEl) return;

  closeMobileNav();

  mobileNavToggleEl.addEventListener('click', event => {
    event.stopPropagation();
    if (document.body.classList.contains('mobile-nav-open')) {
      closeMobileNav();
      return;
    }
    openMobileNav();
  });

  mobileNavEl.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  document.addEventListener('click', event => {
    if (!isMobileNavViewport() || !document.body.classList.contains('mobile-nav-open')) return;
    if (mobileNavEl.contains(event.target) || mobileNavToggleEl.contains(event.target)) return;
    closeMobileNav();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMobileNav();
    }
  });

  const handleViewportChange = event => {
    if (!event.matches) {
      closeMobileNav();
    }
  };

  if (typeof mobileNavMedia.addEventListener === 'function') {
    mobileNavMedia.addEventListener('change', handleViewportChange);
  } else if (typeof mobileNavMedia.addListener === 'function') {
    mobileNavMedia.addListener(handleViewportChange);
  }
}

function closeMobileFilters() {
  if (!filtersEl || !filtersTriggerEl) return;
  document.body.classList.remove('filters-sheet-open');
  filtersTriggerEl.setAttribute('aria-expanded', 'false');
  if (isMobileFiltersViewport()) {
    filtersEl.setAttribute('aria-hidden', 'true');
  } else {
    filtersEl.removeAttribute('aria-hidden');
  }
}

function openMobileFilters() {
  if (!filtersEl || !filtersTriggerEl || !isMobileFiltersViewport()) return;
  document.body.classList.add('filters-sheet-open');
  filtersTriggerEl.setAttribute('aria-expanded', 'true');
  filtersEl.setAttribute('aria-hidden', 'false');
}

function installMobileFiltersSheet() {
  if (!filtersEl || !filtersTriggerEl) return;

  closeMobileFilters();

  filtersTriggerEl.addEventListener('click', () => {
    if (document.body.classList.contains('filters-sheet-open')) {
      closeMobileFilters();
      return;
    }
    openMobileFilters();
  });

  filtersCloseEls.forEach(element => {
    element.addEventListener('click', closeMobileFilters);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMobileFilters();
    }
  });

  const handleViewportChange = event => {
    if (!event.matches) {
      closeMobileFilters();
      return;
    }
    filtersEl.setAttribute('aria-hidden', 'true');
  };

  if (typeof mobileFiltersMedia.addEventListener === 'function') {
    mobileFiltersMedia.addEventListener('change', handleViewportChange);
  } else if (typeof mobileFiltersMedia.addListener === 'function') {
    mobileFiltersMedia.addListener(handleViewportChange);
  }
}

function refreshProductsFromAdminState() {
  const freshProducts = buildCatalogProducts();
  products.splice(0, products.length, ...freshProducts);
  renderProducts();
  renderProductDetail();
}

function createAdminSizeOptions(selected) {
  return DEFAULT_SIZES.map(size => `<option value="${size}" ${Number(selected) === size ? 'selected' : ''}>${size}</option>`).join('');
}

function createAdminCoverOptions(images, selected) {
  if (!images.length) return '<option value="">Sin fotos</option>';
  return images.map((image, index) => `
    <option value="${escapeHtml(image)}" ${image === selected ? 'selected' : ''}>
      Foto ${index + 1}${index === 0 ? ' (primera)' : ''}
    </option>`).join('');
}

function renderAdminPanel() {
  let panel = document.getElementById('product-admin-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'product-admin-panel';
    panel.className = 'admin-panel-overlay';
    document.body.appendChild(panel);
  }

  const adminState = getStoredProductAdminState();

  panel.innerHTML = `
    <div class="admin-panel-box" role="dialog" aria-modal="true" aria-labelledby="admin-panel-title">
      <div class="admin-panel-head">
        <div>
          <strong id="admin-panel-title">Administrador de modelos</strong>
          <span id="admin-save-status">Tallas fabricadas e imagen particular por modelo.</span>
        </div>
        <button class="admin-close" type="button" data-admin-action="close">Cerrar</button>
      </div>
      <div class="admin-product-list">
        ${products.map(product => {
          const key = getProductAdminKey(product);
          const meta = adminState[key] || {};
          const stockSizes = getProductStockSizes(product);
          const defaultMin = Math.min(...stockSizes);
          const defaultMax = Math.max(...stockSizes);
          const minSize = meta.minSize || defaultMin;
          const maxSize = meta.maxSize || defaultMax;
          const images = normalizeProductImages(meta);
          const coverImage = getProductCoverImage(meta, images);
          const imageSummary = images.length
            ? `${images.length} foto${images.length === 1 ? '' : 's'} cargada${images.length === 1 ? '' : 's'}.`
            : 'Sin fotos cargadas.';
          const description = typeof meta.description === 'string' ? meta.description : product.description;
          const details = normalizeProductDetails(meta.details, product.details || []);

          return `
            <article class="admin-product-row" data-admin-product-key="${escapeHtml(key)}">
              <div class="admin-product-preview">
                <div class="admin-product-thumb">${getProductImageMarkup(product)}</div>
                <div>
                  <strong>${product.name}</strong>
                  <span>${getCategoryLabel(product.category)}</span>
                </div>
              </div>
              <label>
                <span>Desde talla</span>
                <select data-admin-field="minSize">${createAdminSizeOptions(minSize)}</select>
              </label>
              <label>
                <span>Hasta talla</span>
                <select data-admin-field="maxSize">${createAdminSizeOptions(maxSize)}</select>
              </label>
              <label class="admin-file-field">
                <span>Fotos del modelo</span>
                <input type="file" accept="image/*" multiple data-admin-field="images">
                <small>${imageSummary}</small>
              </label>
              <label>
                <span>Portada catalogo</span>
                <select data-admin-field="coverImage" ${images.length ? '' : 'disabled'}>${createAdminCoverOptions(images, coverImage)}</select>
              </label>
              <button class="admin-clear-image" type="button" data-admin-action="clear-images">Quitar fotos</button>
              <label class="admin-description-field">
                <span>Descripcion principal</span>
                <textarea data-admin-field="description" rows="3">${escapeHtml(description)}</textarea>
              </label>
              <label class="admin-description-field">
                <span>Descripcion en detalle</span>
                <textarea data-admin-field="details" rows="4">${escapeHtml(details.join('\n'))}</textarea>
              </label>
            </article>`;
        }).join('')}
      </div>
    </div>`;
}

function renderAdminLogin() {
  let login = document.getElementById('product-admin-login');
  if (!login) {
    login = document.createElement('div');
    login.id = 'product-admin-login';
    login.className = 'admin-login-overlay';
    document.body.appendChild(login);
  }

  login.innerHTML = `
    <form class="admin-login-box" data-admin-login-form>
      <strong>Acceso administrador</strong>
      <label>
        <span>ContraseÃ±a</span>
        <input id="admin-password-input" type="password" autocomplete="current-password">
      </label>
      <p class="admin-login-error" id="admin-login-error" hidden>ContraseÃ±a incorrecta.</p>
      <div class="admin-login-actions">
        <button class="admin-clear-image" type="button" data-admin-action="login-cancel">Cancelar</button>
        <button class="admin-close" type="submit">Entrar</button>
      </div>
    </form>`;
}

function openAdminLogin() {
  renderAdminLogin();
  document.body.classList.add('admin-login-open');
  window.setTimeout(() => {
    document.getElementById('admin-password-input')?.focus();
  }, 0);
}

function closeAdminLogin() {
  document.body.classList.remove('admin-login-open');
}

function openAdminPanel() {
  renderAdminPanel();
  document.body.classList.add('admin-panel-open');
}

function closeAdminPanel() {
  document.body.classList.remove('admin-panel-open');
}

async function updateProductAdminMeta(productKey, updates) {
  if (!canWriteProductAdminFiles()) {
    setAdminSaveStatus('Abre la pagina desde el servidor local: http://127.0.0.1:45126/Zapateria_Chihuahua/botas-seguridad.html', true);
    return;
  }

  const previousPanelScroll = document.getElementById('product-admin-panel')?.scrollTop || 0;
  const previousListScroll = document.querySelector('.admin-product-list')?.scrollTop || 0;
  const previousWindowScroll = window.scrollY || 0;
  const adminState = getStoredProductAdminState();
  adminState[productKey] = {
    ...(adminState[productKey] || {}),
    ...updates
  };

  const min = Number(adminState[productKey].minSize);
  const max = Number(adminState[productKey].maxSize);
  if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
    adminState[productKey].maxSize = min;
  }

  setAdminSaveStatus('Guardando...');
  const savedProducts = await saveProductAdminState(adminState);
  refreshProductsFromAdminState();
  renderAdminPanel();
  const panel = document.getElementById('product-admin-panel');
  const list = document.querySelector('.admin-product-list');
  if (panel) panel.scrollTop = previousPanelScroll;
  if (list) list.scrollTop = previousListScroll;
  window.scrollTo({ top: previousWindowScroll, left: 0 });
  setAdminSaveStatus(
    savedProducts ? 'Guardado en product-admin-data.js e img/productos.' : 'No se pudo guardar. Verifica que ejecutar-zapateria-local.bat este abierto.',
    !savedProducts
  );
}

function installProductAdminAccess() {
  const logo = document.querySelector('.brand-logo-img');
  if (!logo) return;

  let clickCount = 0;
  let resetTimer = null;

  logo.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    clickCount += 1;
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      clickCount = 0;
    }, 5000);

    if (clickCount < 7) return;
    clickCount = 0;
    window.clearTimeout(resetTimer);
    openAdminLogin();
    return;
  });
}

document.addEventListener('click', event => {
  const target = event.target instanceof HTMLElement ? event.target.closest('[data-admin-action]') : null;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.adminAction;
  if (action === 'close') {
    closeAdminPanel();
    return;
  }

  if (action === 'login-cancel') {
    closeAdminLogin();
    return;
  }

  if (action === 'clear-images') {
    const row = target.closest('[data-admin-product-key]');
    const productKey = row?.dataset.adminProductKey;
    if (!productKey) return;
    updateProductAdminMeta(productKey, { image: '', images: [], coverImage: '' });
    return;
  }

  if (action === 'select-detail-image') {
    const thumb = target.closest('.detail-thumb');
    selectDetailImageFromThumb(thumb);
  }
});

document.addEventListener('submit', event => {
  const form = event.target instanceof HTMLElement ? event.target.closest('[data-admin-login-form]') : null;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();

  const input = form.querySelector('#admin-password-input');
  const error = form.querySelector('#admin-login-error');
  const password = input instanceof HTMLInputElement ? input.value : '';

  if (password === ADMIN_PASSWORD) {
    closeAdminLogin();
    openAdminPanel();
    return;
  }

  if (error instanceof HTMLElement) {
    error.hidden = false;
  }
});

document.addEventListener('change', event => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
  const row = target.closest('[data-admin-product-key]');
  const productKey = row?.dataset.adminProductKey;
  const field = target.dataset.adminField;
  if (!productKey || !field) return;

  if (field === 'minSize' || field === 'maxSize') {
    updateProductAdminMeta(productKey, { [field]: Number(target.value) });
    return;
  }

  if (field === 'coverImage') {
    updateProductAdminMeta(productKey, {
      coverImage: target.value,
      image: target.value
    });
    return;
  }

  if (field === 'description') {
    updateProductAdminMeta(productKey, { description: target.value.trim() });
    return;
  }

  if (field === 'details') {
    updateProductAdminMeta(productKey, { details: normalizeProductDetails(target.value, []) });
    return;
  }

  if (field === 'images' && target instanceof HTMLInputElement) {
    const files = Array.from(target.files || []).filter(file => file.type.startsWith('image/'));
    if (!files.length) return;

    target.disabled = true;
    setAdminSaveStatus(`Procesando ${files.length} foto${files.length === 1 ? '' : 's'}...`);

    Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        resolve(typeof reader.result === 'string' ? reader.result : '');
      });
      reader.addEventListener('error', () => {
        resolve('');
      });
      reader.readAsDataURL(file);
    }))).then(images => {
      const nextImages = images.filter(Boolean);
      if (!nextImages.length) {
        target.disabled = false;
        setAdminSaveStatus('No se pudieron leer las imagenes seleccionadas.', true);
        return;
      }
      updateProductAdminMeta(productKey, {
        image: '',
        images: nextImages,
        coverImage: nextImages[0] || ''
      });
    }).catch(() => {
      target.disabled = false;
      setAdminSaveStatus('No se pudieron leer las imagenes seleccionadas.', true);
    });
  }
});

[searchEl].forEach(element => {
  if (element) element.addEventListener('input', renderProducts);
});

[sizeEl, sortEl].forEach(element => {
  if (element) element.addEventListener('change', renderProducts);
});

if (categoryEl && pageCategory === 'todos') {
  categoryEl.addEventListener('input', renderProducts);
}

if (clearEl) {
  clearEl.addEventListener('click', () => {
    if (searchEl) searchEl.value = '';
    if (categoryEl) categoryEl.value = pageCategory === 'todos' ? 'todos' : pageCategory;
    if (sizeEl) sizeEl.value = '';
    if (sortEl) sortEl.value = 'default';
    renderProducts();
  });
}

if (yearEl) yearEl.textContent = new Date().getFullYear();

applyCatalogFiltersFromUrl();
populateSizeFilterOptions();
renderActiveFilterChips();
installMobileNav();
installMobileFiltersSheet();
installActiveFilterChipActions();
installCategoryNavigation();
installProductAdminAccess();
renderProducts();
renderProductDetail();

if (new URLSearchParams(window.location.search).get('admin') === '1') {
  window.setTimeout(openAdminLogin, 250);
}
