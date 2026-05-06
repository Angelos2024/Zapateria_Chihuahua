const WHATSAPP = "526144175161";

function normalizar(txt){return (txt || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}

function iniciarCatalogo(){
  const grid = document.querySelector("#productGrid");
  if(!grid) return;
  const cards = [...grid.querySelectorAll(".product")];
  const search = document.querySelector("#searchInput");
  const type = document.querySelector("#typeFilter");
  const price = document.querySelector("#priceFilter");
  const empty = document.querySelector("#emptyState");

  function filtrar(){
    const q = normalizar(search?.value || "");
    const t = type?.value || "all";
    const p = price?.value || "all";
    let visibles = 0;

    cards.forEach(card=>{
      const text = normalizar(card.dataset.name + " " + card.dataset.tags);
      const cardType = card.dataset.type;
      const cardPrice = Number(card.dataset.price || 0);
      const coincideTexto = !q || text.includes(q);
      const coincideTipo = t === "all" || cardType === t;
      let coincidePrecio = true;
      if(p === "low") coincidePrecio = cardPrice < 900;
      if(p === "mid") coincidePrecio = cardPrice >= 900 && cardPrice <= 1300;
      if(p === "high") coincidePrecio = cardPrice > 1300;
      const show = coincideTexto && coincideTipo && coincidePrecio;
      card.style.display = show ? "block" : "none";
      if(show) visibles++;
    });
    if(empty) empty.style.display = visibles ? "none" : "block";
  }

  [search,type,price].forEach(el=>el && el.addEventListener("input",filtrar));
  filtrar();
}

function iniciarModal(){
  const modal = document.querySelector("#productModal");
  if(!modal) return;
  const title = modal.querySelector("#modalTitle");
  const desc = modal.querySelector("#modalDesc");
  const specs = modal.querySelector("#modalSpecs");
  const wa = modal.querySelector("#modalWhatsApp");
  const close = modal.querySelector(".modal-close");

  document.querySelectorAll("[data-view]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const card = btn.closest(".product");
      const name = card.dataset.name;
      const price = card.dataset.price;
      title.textContent = name;
      desc.textContent = card.dataset.desc || "Modelo disponible para cotización directa en tienda o por WhatsApp.";
      specs.innerHTML = (card.dataset.tags || "").split(",").filter(Boolean).map(s=>`<span>${s.trim()}</span>`).join("");
      wa.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, quiero consultar disponibilidad del modelo: " + name + " ($" + price + ")")}`;
      modal.classList.add("open");
    });
  });
  close.addEventListener("click",()=>modal.classList.remove("open"));
  modal.addEventListener("click",e=>{if(e.target===modal) modal.classList.remove("open")});
}

document.addEventListener("DOMContentLoaded",()=>{iniciarCatalogo();iniciarModal();});
