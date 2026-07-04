import "server-only";
import { requireComprador } from "./auth";

// Datos fiscales del comprador para CFDI. RFC es SENSIBLE (RLS self en facturacion_perfiles).
// La EMISIÓN del CFDI (vía PAC) está diferida; aquí solo se capturan y reusan los datos.
export type PerfilFacturacion = {
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  usoCfdi: string;
  cpFiscal: string;
  email: string;
};

export const PERFIL_FACTURACION_VACIO: PerfilFacturacion = {
  rfc: "",
  razonSocial: "",
  regimenFiscal: "",
  usoCfdi: "",
  cpFiscal: "",
  email: "",
};

// Catálogos SAT: viven en un módulo plano (reutilizable en cliente); se reexportan por comodidad.
export { REGIMENES_FISCALES, USOS_CFDI } from "./facturacion-catalogos";

export async function getFacturacionPerfil(): Promise<PerfilFacturacion> {
  const { supabase, user } = await requireComprador();
  const { data } = await supabase
    .from("facturacion_perfiles")
    .select("rfc,razon_social,regimen_fiscal,uso_cfdi,cp_fiscal,email")
    .eq("user_id", user.id)
    .maybeSingle();
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    rfc: (r.rfc as string) ?? "",
    razonSocial: (r.razon_social as string) ?? "",
    regimenFiscal: (r.regimen_fiscal as string) ?? "",
    usoCfdi: (r.uso_cfdi as string) ?? "",
    cpFiscal: (r.cp_fiscal as string) ?? "",
    email: (r.email as string) ?? "",
  };
}
