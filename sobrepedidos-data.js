/*
  CATÁLOGO SOBRE PEDIDO — configuración editable
  ------------------------------------------------
  El catálogo de sobrepedidos se arma AUTOMÁTICAMENTE con todos los modelos
  que ya manejas (los del inventario y los que tienen foto/ficha guardada),
  sin importar si hay o no existencias en tienda.

  Aquí SOLO ajustas lo que falte: precio y rango de tallas por modelo.

  - defaults:  rango de tallas que se usa cuando un modelo no tiene uno definido.
  - overrides: ajustes por modelo (precio, talla mínima/máxima, nombre, categoría
               o esconderlo). Puedes usar como clave:
                 * la clave del modelo tal como aparece en product-admin-data.js
                   (por ejemplo "inventory:botas:atx cafe"), o
                 * el nombre del modelo (por ejemplo "ATX Café").
  - extraModels: modelos que todavía NO están en el inventario ni tienen ficha
                 y que quieres agregar a mano al catálogo de sobrepedidos.
*/
window.SOBREPEDIDOS_CONFIG = {
  defaults: {
    minSize: 25,
    maxSize: 31
  },

  overrides: {
    // Ejemplos (quita el // para activarlos y edítalos):
    // "inventory:botas:atx cafe": { salePrice: 950, minSize: 25, maxSize: 30 },
    // "ATX Negra": { salePrice: 980, minSize: 25, maxSize: 31 },
    // "inventory:tenis:flow": { hidden: true } // para ocultar un modelo del catálogo
  },

  extraModels: [
    // Ejemplo de modelo agregado a mano (quita el // y edítalo):
    // {
    //   model: "Bota Especial Importada",
    //   category: "botas",           // "botas" o "tenis"
    //   salePrice: 1200,
    //   minSize: 25,
    //   maxSize: 30,
    //   description: "Modelo bajo pedido especial.",
    //   details: ["Detalle 1", "Detalle 2"],
    //   images: ["img/productos/mi-foto.jpg"]
    // }
  ]
};
