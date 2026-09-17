import { useState, type ReactNode } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  variant = "plain",
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  variant?: "plain" | "card";
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={
        variant === "card"
          ? "overflow-hidden border-b border-border bg-card last:border-b-0"
          : "border-b border-border"
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 text-left text-sm font-medium leading-[25.2px] text-ink md:text-base ${
          variant === "card" ? "min-h-[63px] px-3 py-[18px]" : "min-h-[63px] justify-between px-1 py-[18px]"
        }`}
      >
        {variant === "card" &&
          (open ? <Minus className="size-3.5 shrink-0" /> : <Plus className="size-3.5 shrink-0" />)}
        <span className="flex-1">{title}</span>
        {variant === "plain" && (
          <ChevronDown className={`size-4 shrink-0 text-ink transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>
      {open && (
        <div className={`space-y-4 pb-5 text-sm leading-[1.8] text-muted-foreground ${variant === "card" ? "px-10" : "px-1"}`}>
          {children}
        </div>
      )}
    </div>
  );
}
