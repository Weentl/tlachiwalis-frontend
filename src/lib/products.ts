export type Product = {
  id: string;
  nombre: string;
  oficio: string;
  region: string;
  maker: string;
  precio: number;
  img: string;
  descripcion: string;
  tecnica: string;
  materiales: string;
  medidas: string;
};

// Card del comprador desde la vista ampliada productos_storefront (0022): incluye precio-desde,
// disponibilidad, tipo de producto y el artesano. Distinto de `Product` (que conserva el fallback
// estático). Sin fallback demo: 0 filas = "sin resultados".
export type CardProducto = {
  id: string;
  nombre: string;
  maker: string;
  oficio: string;
  region: string;
  precio: number; // base, en pesos
  precioDesde: number; // en pesos
  esDesde: boolean; // precio_desde != precio base → mostrar "desde $X"
  img: string;
  disponibleTotal: number;
  tipo: string; // 'unico' | 'stock_simple' | 'con_variantes'
  artesanoSlug: string | null;
  categoriaId: number | null;
  destacado: boolean;
  tendencia: boolean;
  publicadoEn: string; // ISO; para orden "novedades"
};

// Oficios disponibles (categorías de filtro del catálogo)
export const oficios = ["Talavera", "Barro negro", "Alebrijes", "Telar de cintura", "Cestería"];

// Catálogo de piezas (datos de prueba; precios placeholder de demo)
export const products: Product[] = [
  { id: "tal-01", nombre: "Plato de Talavera", oficio: "Talavera", region: "Puebla", maker: "Talavera Hnos.", precio: 1290, img: "/images/talavera-1.jpg", descripcion: "Plato decorativo de Talavera poblana, esmaltado y pintado a mano con motivos tradicionales en azul cobalto sobre fondo blanco.", tecnica: "Mayólica esmaltada, alta temperatura", materiales: "Barro de Puebla, esmaltes minerales", medidas: "28 cm de diámetro" },
  { id: "bar-01", nombre: "Olla de barro bruñido", oficio: "Barro negro", region: "Oaxaca", maker: "Macrina Pacheco", precio: 1850, img: "/images/pottery-1.jpg", descripcion: "Olla de barro negro bruñido de San Bartolo Coyotepec, pulida con cuarzo hasta lograr su brillo característico.", tecnica: "Barro negro bruñido, horno de leña", materiales: "Arcilla negra de Oaxaca", medidas: "22 × 20 cm" },
  { id: "ale-01", nombre: "Alebrije jaguar", oficio: "Alebrijes", region: "Oaxaca", maker: "Familia Ortega", precio: 3400, img: "/images/alebrije-1.jpg", descripcion: "Alebrije tallado en copal y pintado a mano con grecas y puntillismo zapoteco. Pieza única.", tecnica: "Talla en copal, pintura a pincel fino", materiales: "Madera de copal", medidas: "32 cm de largo" },
  { id: "tel-01", nombre: "Huipil de telar de cintura", oficio: "Telar de cintura", region: "Chiapas", maker: "Rosa Hernández", precio: 2600, img: "/images/huipil-1.jpg", descripcion: "Huipil tejido en telar de cintura por manos tzotziles de Zinacantán, con brocados florales.", tecnica: "Telar de cintura, brocado a mano", materiales: "Algodón y lana teñidos", medidas: "Talla única" },
  { id: "tal-02", nombre: "Jarra de Talavera", oficio: "Talavera", region: "Puebla", maker: "Talavera Hnos.", precio: 1640, img: "/images/talavera-2.jpg", descripcion: "Jarra de Talavera para agua o flores, vidriada y decorada a mano.", tecnica: "Mayólica esmaltada", materiales: "Barro de Puebla, esmaltes minerales", medidas: "26 cm de alto" },
  { id: "bar-02", nombre: "Cántaro de barro negro", oficio: "Barro negro", region: "Oaxaca", maker: "Taller Coyotepec", precio: 1420, img: "/images/pottery-2.jpg", descripcion: "Cántaro de barro negro mate, modelado a mano con formas tradicionales oaxaqueñas.", tecnica: "Barro negro, modelado a mano", materiales: "Arcilla negra de Oaxaca", medidas: "30 × 18 cm" },
  { id: "ale-02", nombre: "Alebrije venado", oficio: "Alebrijes", region: "Oaxaca", maker: "Familia Ortega", precio: 2980, img: "/images/alebrije-2.jpg", descripcion: "Venado alebrije en copal, con cornamenta tallada y decoración policroma.", tecnica: "Talla en copal, pintura a pincel", materiales: "Madera de copal", medidas: "26 cm de alto" },
  { id: "tel-02", nombre: "Rebozo de algodón", oficio: "Telar de cintura", region: "Chiapas", maker: "Rosa Hernández", precio: 1980, img: "/images/textile-1.jpg", descripcion: "Rebozo tejido en telar de cintura, con rapacejo anudado a mano.", tecnica: "Telar de cintura", materiales: "Algodón natural", medidas: "2.2 m × 70 cm" },
  { id: "tel-03", nombre: "Camino de mesa tejido", oficio: "Telar de cintura", region: "Oaxaca", maker: "Coop. Vida Nueva", precio: 890, img: "/images/textile-2.jpg", descripcion: "Camino de mesa tejido por mujeres zapotecas, teñido con tintes naturales.", tecnica: "Telar de cintura, tinte natural", materiales: "Lana teñida con grana y añil", medidas: "1.4 m × 40 cm" },
  { id: "ces-01", nombre: "Cesta de palma tejida", oficio: "Cestería", region: "Hidalgo", maker: "Coop. Tenango", precio: 980, img: "/images/handicraft-1.jpg", descripcion: "Cesta tejida en palma con patrones geométricos, ideal para guardar o decorar.", tecnica: "Tejido en palma", materiales: "Palma natural", medidas: "30 × 25 cm" },
  { id: "ces-02", nombre: "Canasta tejida grande", oficio: "Cestería", region: "Hidalgo", maker: "Coop. Tenango", precio: 1150, img: "/images/handicraft-2.jpg", descripcion: "Canasta grande de palma con asas, tejido firme para uso diario.", tecnica: "Tejido en palma", materiales: "Palma natural", medidas: "40 × 35 cm" },
  { id: "bar-03", nombre: "Catrina de barro", oficio: "Barro negro", region: "Edo. de México", maker: "Taller Linares", precio: 2200, img: "/images/catrina-1.jpg", descripcion: "Catrina modelada en barro y pintada a mano, homenaje a la tradición del Día de Muertos.", tecnica: "Modelado en barro, pintura a mano", materiales: "Barro y pigmentos", medidas: "38 cm de alto" },
];

export const formatMXN = (n: number) => "$" + n.toLocaleString("es-MX");

export const getProduct = (id: string) => products.find((p) => p.id === id);
