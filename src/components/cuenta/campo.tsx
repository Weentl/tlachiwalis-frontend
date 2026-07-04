// Campo de texto del storefront ("Manos"): input redondeado, borde hairline, foco grana.
export const inputCls =
  "mt-1.5 w-full rounded-[12px] border border-linea bg-lino px-3.5 py-2.5 text-tinta transition-colors placeholder:text-ceniza/70 focus:border-grana focus:outline-none";

export const labelCls =
  "font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ceniza";

export function Campo({
  label,
  name,
  type = "text",
  defaultValue,
  error,
  required,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className={labelCls}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputCls}
      />
      {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
