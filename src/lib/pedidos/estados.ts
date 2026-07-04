// Estados del pedido (fulfillment) — compartido por comprador (Manos), vendedor y admin (paneles).
// Módulo plano: usable en cliente y servidor. Colores en hex (inline style) para servir a ambos temas.

export type EstadoFulfillment = "por_validar" | "validado" | "enviado" | "entregado" | "cancelado";
// Estados a los que se puede AVANZAR (destino de una transición; nunca 'por_validar').
export type EstadoDestino = "validado" | "enviado" | "entregado" | "cancelado";

export const ESTADO_INFO: Record<EstadoFulfillment, { label: string; corto: string; color: string }> = {
  por_validar: { label: "Por confirmar", corto: "Por confirmar", color: "#c9a24b" },
  validado: { label: "Confirmado · en preparación", corto: "Confirmado", color: "#b45f39" },
  enviado: { label: "Enviado", corto: "Enviado", color: "#26324f" }, // añil = en tránsito
  entregado: { label: "Entregado", corto: "Entregado", color: "#127a63" }, // jade = completado
  cancelado: { label: "Cancelado", corto: "Cancelado", color: "#9a2a22" },
};

// Pasos lineales para el seguimiento del comprador (cancelado se muestra aparte).
export const PASOS_PEDIDO: { estado: EstadoFulfillment; label: string }[] = [
  { estado: "por_validar", label: "Comprado" },
  { estado: "validado", label: "Confirmado" },
  { estado: "enviado", label: "Enviado" },
  { estado: "entregado", label: "Entregado" },
];

export const RANK: Record<EstadoFulfillment, number> = {
  por_validar: 0,
  validado: 1,
  enviado: 2,
  entregado: 3,
  cancelado: -1,
};

// Acciones que el vendedor/admin puede tomar desde cada estado (espeja la RPC avanzar_fulfillment).
export type AccionPedido = { estado: EstadoDestino; label: string; requiereGuia?: boolean; destructiva?: boolean };

export function accionesDesde(estado: EstadoFulfillment): AccionPedido[] {
  switch (estado) {
    case "por_validar":
      return [
        { estado: "validado", label: "Confirmar pedido" },
        { estado: "cancelado", label: "Cancelar", destructiva: true },
      ];
    case "validado":
      return [
        { estado: "enviado", label: "Marcar enviado", requiereGuia: true },
        { estado: "cancelado", label: "Cancelar", destructiva: true },
      ];
    case "enviado":
      return [{ estado: "entregado", label: "Marcar entregado" }];
    default:
      return [];
  }
}

// Traduce los errores de la RPC avanzar_fulfillment a mensajes legibles.
export function mensajeErrorPedido(msg: string): string {
  if (msg.includes("guia_requerida")) return "Ingresa la guía para marcarlo como enviado.";
  if (msg.includes("no_autorizado")) return "No tienes permiso sobre este pedido.";
  if (msg.includes("transicion_invalida")) return "Ese cambio de estado no es válido.";
  if (msg.includes("estado_terminal")) return "El pedido ya está en un estado final.";
  if (msg.includes("no_cancelable")) return "Ya no se puede cancelar (el pedido fue enviado).";
  if (msg.includes("fulfillment_no_encontrado")) return "No se encontró el pedido.";
  return "No se pudo actualizar el pedido.";
}

// Estado agregado de una orden con varios envíos (para la lista del comprador).
export function estadoAgregado(estados: EstadoFulfillment[]): EstadoFulfillment {
  if (estados.length === 0) return "por_validar";
  if (estados.every((e) => e === "entregado")) return "entregado";
  if (estados.every((e) => e === "cancelado")) return "cancelado";
  const vivos = estados.filter((e) => e !== "cancelado");
  if (vivos.length === 0) return "cancelado";
  // el menos avanzado marca el estado global (aún falta ese envío)
  return vivos.reduce((min, e) => (RANK[e] < RANK[min] ? e : min), vivos[0]);
}
