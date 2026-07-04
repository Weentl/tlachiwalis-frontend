import { z } from "zod";
import { passwordFuerteSchema } from "@/lib/password-strength";

// Contrato de datos del registro autoguiado (lo valida el Server Action enviarRegistro,
// autoridad server-side; el wizard valida por paso como guía de UX). Sin fotos: se suben
// desde el panel tras la aprobación (pendiente).
export const registroSchema = z
  .object({
    token: z.string().min(20),
    nombres: z.string().trim().min(1, "Falta tu nombre"),
    apellidoP: z.string().trim().min(1, "Falta tu apellido paterno"),
    apellidoM: z.string().trim().optional().default(""),
    fechaNac: z.string().min(1, "Falta tu fecha de nacimiento"),
    telefono: z.string().regex(/^\d{10}$/, "El teléfono debe tener 10 dígitos"),
    email: z.string().trim().toLowerCase().email("Correo inválido"),
    password: passwordFuerteSchema,
    tipoVendedor: z.enum(["persona", "taller", "tienda"]),
    nombreNegocio: z.string().trim().optional().default(""),
    numPersonas: z.string().optional().default(""),
    ciudad: z.string().trim().optional().default(""),
    semblanza: z.string().max(2000).optional().default(""),
    oficio: z.string().trim().optional().default(""),
    region: z.string().trim().optional().default(""),
    instagram: z.string().trim().optional().default(""),
    sitio: z.string().trim().optional().default(""),
    aniosExp: z.string().optional().default(""),
    enviaNacional: z.boolean().optional().default(false),
  })
  .refine((d) => d.tipoVendedor === "persona" || d.nombreNegocio.length > 0, {
    path: ["nombreNegocio"],
    message: "Falta el nombre del negocio",
  });

export type RegistroInput = z.infer<typeof registroSchema>;
