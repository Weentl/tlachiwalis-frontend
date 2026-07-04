import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-tinto text-[#f7f1e6] hover:bg-[#6b2a23]",
  outline: "border border-tinto/30 text-tinto hover:bg-tinto/5",
  ghost: "text-tinto hover:bg-tinto/5",
  danger:
    "border border-destructive/40 text-destructive hover:bg-destructive hover:text-[#f7f1e6]",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-ob-sm px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] transition-colors disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
