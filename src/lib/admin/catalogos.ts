// Catálogos controlados para los selects del admin (mejor UX, datos consistentes).

// Régimen fiscal — claves y nombres del SAT aplicables a artesanos (persona física
// principalmente; se incluyen dos de persona moral para talleres constituidos).
export const REGIMEN_FISCAL = [
  { codigo: "626", nombre: "Régimen Simplificado de Confianza (RESICO)" },
  { codigo: "612", nombre: "Actividades Empresariales y Profesionales" },
  { codigo: "621", nombre: "Incorporación Fiscal (RIF)" },
  { codigo: "625", nombre: "Ingresos por Plataformas Tecnológicas" },
  { codigo: "606", nombre: "Arrendamiento" },
  { codigo: "605", nombre: "Sueldos y Salarios" },
  { codigo: "622", nombre: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
  { codigo: "608", nombre: "Demás ingresos" },
  { codigo: "616", nombre: "Sin obligaciones fiscales" },
  { codigo: "601", nombre: "General de Ley Personas Morales" },
  { codigo: "603", nombre: "Personas Morales con Fines no Lucrativos" },
] as const;
export const REGIMEN_CODES = REGIMEN_FISCAL.map((r) => r.codigo);
export const regimenLabel = (codigo: string | null) => {
  if (!codigo) return "—";
  const r = REGIMEN_FISCAL.find((x) => x.codigo === codigo);
  return r ? `${r.codigo} · ${r.nombre}` : codigo;
};

// 32 entidades federativas de México (nombres canónicos).
export const ESTADOS_MX = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
  "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango",
  "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco",
  "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla",
  "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora",
  "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
] as const;

// Oficios artesanales (catálogo controlado; incluye los del seed actual).
export const OFICIOS = [
  "Talavera", "Barro negro", "Barro vidriado", "Alfarería", "Cerámica",
  "Alebrijes", "Talla en madera", "Cartonería", "Bordado", "Telar de cintura",
  "Rebozo", "Deshilado", "Cestería", "Palma tejida", "Joyería en plata",
  "Filigrana", "Cobre martillado", "Hojalata", "Vidrio soplado", "Laca / Maque",
  "Papel amate", "Piteado", "Talabartería", "Otro",
] as const;

// 'pausado' NO es solo etiqueta: corta el acceso del artesano (login + RLS), ver 0010.
export const STATUS_ARTESANO = [
  { value: "activo", label: "Activo" },
  { value: "pausado", label: "Pausado (sin acceso)" },
] as const;

export const STATUS_PRODUCTO = [
  { value: "borrador", label: "Borrador" },
  { value: "publicado", label: "Publicado" },
  { value: "agotado", label: "Agotado" },
] as const;

// Validación de CLABE: 18 dígitos + dígito verificador (módulo 10, pesos 3-7-1).
export function clabeValida(clabe: string): boolean {
  if (!/^\d{18}$/.test(clabe)) return false;
  const pesos = [3, 7, 1];
  let suma = 0;
  for (let i = 0; i < 17; i++) {
    suma += (Number(clabe[i]) * pesos[i % 3]) % 10;
  }
  const dv = (10 - (suma % 10)) % 10;
  return dv === Number(clabe[17]);
}

// helpers para construir <option> desde catálogos planos
export const opcionesDe = (xs: readonly string[]) =>
  xs.map((x) => ({ value: x, label: x }));
