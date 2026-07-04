import * as React from "react";
import { cn } from "@/lib/utils";

/* Boton — botón del STOREFRONT ("Manos"). Distinto del <Button> compartido con el
   panel admin/vendedor (ese no se toca). Sentence-case, superficie táctil ≥44px,
   un solo acento de acción (grana). `pill` para CTAs. `botonCls` reutiliza el estilo
   en <Link> ("link con forma de botón"). */

export type BotonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "anil"
  | "danger";
export type BotonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 font-sans font-medium leading-none whitespace-nowrap " +
  "transition-[transform,background-color,box-shadow,border-color,color] duration-200 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55";

const variantCls: Record<BotonVariant, string> = {
  primary: "bg-grana text-[#FFF7EE] shadow-cta hover:bg-grana-viva",
  secondary: "bg-tinta text-cal hover:bg-tinta/90",
  outline:
    "border border-linea bg-transparent text-tinta hover:border-ceniza/45 hover:bg-arena/60",
  ghost: "text-tinta hover:bg-arena/60",
  anil: "bg-anil text-cal hover:bg-anil/90",
  danger:
    "border border-destructive/40 text-destructive hover:bg-destructive hover:text-cal",
};

const sizeCls: Record<BotonSize, string> = {
  sm: "h-9 px-3.5 text-[0.8125rem]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[0.95rem]",
  icon: "h-11 w-11",
};

const radiusCls: Record<BotonSize, string> = {
  sm: "rounded-[10px]",
  md: "rounded-[14px]",
  lg: "rounded-[16px]",
  icon: "rounded-[14px]",
};

export function botonCls({
  variant = "primary",
  size = "md",
  pill = false,
  className,
}: {
  variant?: BotonVariant;
  size?: BotonSize;
  pill?: boolean;
  className?: string;
} = {}) {
  return cn(
    base,
    variantCls[variant],
    sizeCls[size],
    pill ? "rounded-full" : radiusCls[size],
    className,
  );
}

export function Boton({
  className,
  variant = "primary",
  size = "md",
  pill = false,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BotonVariant;
  size?: BotonSize;
  pill?: boolean;
}) {
  return (
    <button
      type={type}
      className={botonCls({ variant, size, pill, className })}
      {...props}
    />
  );
}
