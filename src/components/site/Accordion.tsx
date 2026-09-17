import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

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
          ? "overflow-hidden rounded-2xl border border-border bg-card"
          : "border-b border-border"
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-[15px] font-semibold text-ink md:text-base"
      >
        <span>{title}</span>
        <ChevronDown
          className={`size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-4 px-4 pb-5 text-[15px] leading-relaxed text-muted-foreground">
          {children}
        </div>
      )}
    </div>
  );
}
