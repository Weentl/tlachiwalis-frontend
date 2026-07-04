import type { Metadata } from "next";
import {
  Fraunces,
  Hanken_Grotesk,
  Space_Mono,
  IBM_Plex_Sans,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";

// "Manos" — serif contemporánea cálida, hecha a mano (NO fría como Cormorant).
// Variable con itálica: héroes, títulos, nombres de pieza, citas de artesano.
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

// Todo lo funcional: cuerpo, UI, botones, filtros, formularios, precios.
const body = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Micro-etiquetas de origen (Región · Técnica), números de pedido, créditos.
// Ancla lo artesanal como DATO. No variable → especificar pesos.
const mono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

// Panel admin — IBM Plex Sans: formal, institucional, ajena a la estética
// cultural del storefront. Scope: solo /admin (vía la clase font-admin).
const admin = IBM_Plex_Sans({
  variable: "--font-admin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Títulos del admin oscuro ("command center"): Space Grotesk, geométrica/techy.
const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tlachiwalis · Arte popular mexicano, hecho a mano",
  description:
    "Piezas únicas de los talleres de México. Conoce las manos, la región y la técnica detrás de cada una.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} ${mono.variable} ${admin.variable} ${grotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
