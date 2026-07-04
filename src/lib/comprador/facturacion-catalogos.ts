// Catálogos SAT (subconjunto común para un comprador de marketplace). value = clave oficial.
// Módulo plano (sin server-only) para poder usarse en el acordeón de checkout (cliente).

export const REGIMENES_FISCALES: { value: string; label: string }[] = [
  { value: "612", label: "612 · Personas físicas con actividad empresarial y profesional" },
  { value: "626", label: "626 · Régimen Simplificado de Confianza (RESICO)" },
  { value: "605", label: "605 · Sueldos y salarios" },
  { value: "606", label: "606 · Arrendamiento" },
  { value: "616", label: "616 · Sin obligaciones fiscales" },
  { value: "601", label: "601 · General de Ley Personas Morales" },
  { value: "603", label: "603 · Personas Morales con Fines no Lucrativos" },
];

export const USOS_CFDI: { value: string; label: string }[] = [
  { value: "G01", label: "G01 · Adquisición de mercancías" },
  { value: "G03", label: "G03 · Gastos en general" },
  { value: "S01", label: "S01 · Sin efectos fiscales" },
  { value: "I08", label: "I08 · Otra maquinaria y equipo" },
  { value: "D01", label: "D01 · Honorarios médicos y gastos" },
];
