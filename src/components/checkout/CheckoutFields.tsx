import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export function Field({
  label,
  type = "text",
  autoComplete,
  className = "",
  name,
  required,
  icon,
  list,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  autoComplete?: string;
  className?: string;
  name?: string;
  required?: boolean;
  /** Optional trailing icon rendered inside the field (e.g. address search). */
  icon?: ReactNode;
  /** Optional <datalist> id for address suggestions. */
  list?: string;
  /** Makes the field controlled (used by address auto-fill). */
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className={`relative block ${className}`}>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        list={list}
        placeholder=" "
        {...(value !== undefined ? { value } : {})}
        onChange={onChange ? (e) => onChange(e.currentTarget.value) : undefined}
        className={`peer h-[52px] w-full rounded-xl border border-co-border bg-co-bg px-3 pt-4 text-sm text-co-fg focus:border-co-accent focus:outline-none focus:ring-1 focus:ring-co-accent ${icon ? "pr-11" : ""}`}
      />


      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-co-muted transition-all peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[11px] peer-[&:not(:placeholder-shown)]:top-2.5 peer-[&:not(:placeholder-shown)]:translate-y-0 peer-[&:not(:placeholder-shown)]:text-[11px]">
        {label}
      </span>
      {icon ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-co-muted">
          {icon}
        </span>
      ) : null}
    </label>
  );
}

export function SelectField({
  label,
  options,
  className = "",
  name,
}: {
  label: string;
  options: string[];
  className?: string;
  name?: string;
}) {
  return (
    <label className={`relative block ${className}`}>
      <span className="absolute left-3 top-2 text-[11px] text-co-muted">{label}</span>
      <select
        name={name}
        className="h-[52px] w-full appearance-none rounded-xl border border-co-border bg-co-bg px-3 pt-4 text-sm text-co-fg focus:border-co-accent focus:outline-none focus:ring-1 focus:ring-co-accent"
        defaultValue={options[0]}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-co-muted"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </label>
  );
}

export function CheckLine({ children }: { children: ReactNode }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-co-fg">
      <input
        type="checkbox"
        className="size-4 rounded-sm border-co-border text-co-accent accent-[var(--co-accent)]"
      />
      <span>{children}</span>
    </label>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-lg font-medium text-co-fg">{children}</h2>;
}
