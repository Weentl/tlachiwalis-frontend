"use client";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 text-xs text-destructive" aria-live="polite">
      {msg}
    </p>
  );
}

type Common = {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  hint?: string;
};

export function TextField({
  label,
  name,
  error,
  required,
  hint,
  defaultValue,
  type = "text",
  placeholder,
  readOnly,
  inputMode,
}: Common & {
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <div>
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        className={cn("mt-1.5", readOnly && "cursor-not-allowed opacity-60")}
      />
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError msg={error} />
    </div>
  );
}

export function TextareaField({
  label,
  name,
  error,
  required,
  hint,
  defaultValue,
  rows = 4,
}: Common & { defaultValue?: string | null; rows?: number }) {
  return (
    <div>
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className="mt-1.5"
      />
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError msg={error} />
    </div>
  );
}

export function SelectField({
  label,
  name,
  error,
  required,
  hint,
  defaultValue,
  options,
  placeholder,
}: Common & {
  defaultValue?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="mt-1.5 w-full rounded-ob-sm border border-tinto/20 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-tinto/60 focus:bg-card [&>option]:bg-card [&>option]:text-foreground"
      >
        {placeholder ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError msg={error} />
    </div>
  );
}
