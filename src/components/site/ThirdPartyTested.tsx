import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck, X } from "lucide-react";

import productAsset from "@/assets/collagen-glow-up-pack.png.asset.json";
import logoAsset from "@/assets/nutrition-geeks-logo.png.asset.json";
import { Button } from "@/components/ui/button";

export function ThirdPartyTested() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="mt-6 h-auto w-full justify-start whitespace-normal rounded-lg border-border bg-background px-4 py-3.5 text-left shadow-none hover:bg-background"
        aria-haspopup="dialog"
      >
        <ShieldCheck className="size-10 shrink-0 text-teal" strokeWidth={1.8} />
        <span className="h-10 w-px shrink-0 bg-border" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold text-ink">
            Third-party tested
            <span className="rounded bg-teal-soft px-2 py-0.5 text-[10px] font-bold text-ink">
              JUL 2026
            </span>
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[12px] font-normal text-muted-foreground">
            1 active ingredient tested for quality
            <ArrowRight className="size-3.5 shrink-0" />
          </span>
        </span>
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/55 p-3 backdrop-blur-[1px] sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="third-party-title"
            className="max-h-[calc(100dvh-24px)] w-full max-w-[440px] overflow-y-auto rounded-xl bg-background text-ink shadow-2xl"
          >
            <header className="relative flex h-[58px] items-center justify-center border-b border-border px-14">
              <img
                src={logoAsset.url}
                alt="Nutrition Geeks"
                width={4435}
                height={1826}
                className="h-8 w-auto object-contain"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close test results"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-ink hover:bg-muted"
              >
                <X className="size-5" />
              </Button>
            </header>

            <div className="px-4 pb-4 pt-4 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="grid size-[52px] shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-background">
                  <img
                    src={productAsset.url}
                    alt="Collagen Glow Up Powder"
                    width={52}
                    height={52}
                    className="size-full object-contain"
                  />
                </span>
                <h2 id="third-party-title" className="text-[17px] font-semibold leading-tight text-ink">
                  Collagen Glow Up Powder
                </h2>
              </div>

              <p className="mt-4 text-[13px] leading-[1.45] text-muted-foreground">
                Nutrition Geeks works with accredited, independent laboratories to verify the
                quality and integrity of its products.
              </p>

              <h3 className="mt-4 inline-flex rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-background">
                Active Ingredients
              </h3>

              <div className="mt-3 overflow-hidden rounded-lg border border-border">
                <div className="grid grid-cols-[1fr_1.15fr_1fr] border-b border-border px-4 py-3 text-[8px] font-bold uppercase text-muted-foreground">
                  <span>Active</span>
                  <span className="text-center">Status</span>
                  <span className="text-right">Label claim</span>
                </div>
                <div className="grid grid-cols-[1fr_1.15fr_1fr] items-center px-4 py-3 text-[12px]">
                  <span>Protein</span>
                  <span className="justify-self-center whitespace-nowrap rounded-full border border-teal/25 bg-teal-soft px-2 py-1 text-[7px] font-bold uppercase text-teal">
                    Meets label claim
                  </span>
                  <span className="text-right">12.6 g/serving</span>
                </div>
                <div className="border-t border-border px-4 py-3 text-[9px] font-semibold uppercase text-muted-foreground">
                  Last tested Jul 15, 2026
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-teal-soft px-5 py-3 text-[12px] font-medium text-ink">
              <ShieldCheck className="size-4 shrink-0 text-teal" />
              Tests carried out by Light Labs Technologies
            </div>
            <p className="px-5 py-3 text-[10px] leading-[1.45] text-muted-foreground">
              Third-party test results reflect laboratory analysis of the submitted sample at the
              time of testing and form part of Nutrition Geeks&apos; wider quality assurance programme.
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}