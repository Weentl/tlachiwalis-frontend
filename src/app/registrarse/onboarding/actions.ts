"use server";
import { redirect } from "next/navigation";
import { requireComprador } from "@/lib/comprador/auth";

// Guarda los datos del onboarding (todos opcionales) y marca onboarding_completo.
export async function guardarOnboarding(formData: FormData): Promise<void> {
  const { supabase, user } = await requireComprador();
  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 120);
  const apellido = String(formData.get("apellido") ?? "").trim().slice(0, 120);
  const comoConocio = String(formData.get("como_conocio") ?? "").trim().slice(0, 60);
  const intereses = formData.getAll("intereses").map(String).filter(Boolean).slice(0, 12);

  await supabase
    .from("perfiles")
    .update({
      nombre: nombre || null,
      apellido: apellido || null,
      como_conocio: comoConocio || null,
      intereses,
      onboarding_completo: true,
    })
    .eq("user_id", user.id);

  redirect("/tienda");
}

// Omitir: no perder el paso pero no volver a molestar. Va directo a la tienda.
export async function omitirOnboarding(): Promise<void> {
  const { supabase, user } = await requireComprador();
  await supabase.from("perfiles").update({ onboarding_completo: true }).eq("user_id", user.id);
  redirect("/tienda");
}
