import { z } from "zod";

// "" o whitespace → undefined (→ NULL en la BD). Igual criterio que admin/schemas.
const emptyToUndef = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : v;
  return s === "" || s == null ? undefined : s;
};

// ============================ INVITAR (admin) ============================
// El admin invita a un artesano YA existente (creado en el panel). No captura
// datos del artesano aquí — solo elige a quién invitar. El email es opcional y
// solo referencial (el link se comparte por WhatsApp, no por correo).
export const invitarSchema = z.object({
  artesano_id: z.string().uuid("Artesano inválido"),
  email: z.preprocess(
    emptyToUndef,
    z.string().email("Correo inválido").optional(),
  ),
});

export type InvitarInput = z.infer<typeof invitarSchema>;

// ============================ CLAIM (público /unirse) ============================
// El artesano abre el link y crea su acceso. El token viaja en un hidden (viene
// del querystring `?t=`); el servidor lo revalida contra el hash guardado.
export const claimSchema = z
  .object({
    token: z.string().min(20, "Enlace de invitación inválido"),
    email: z.string().trim().toLowerCase().email("Correo inválido"),
    password: z
      .string()
      .min(8, "Usa al menos 8 caracteres")
      .max(72, "Máximo 72 caracteres"), // límite bcrypt de GoTrue
    password2: z.string(),
    acepta: z
      .preprocess((v) => v === "on" || v === "true" || v === true, z.boolean())
      .refine((v) => v === true, "Debes aceptar los términos para continuar"),
  })
  .refine((d) => d.password === d.password2, {
    path: ["password2"],
    message: "Las contraseñas no coinciden",
  });

export type ClaimInput = z.infer<typeof claimSchema>;
