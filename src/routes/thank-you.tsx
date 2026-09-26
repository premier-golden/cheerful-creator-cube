import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import logoAsset from "@/assets/nutrition-geeks-logo.png.asset.json";

export const Route = createFileRoute("/thank-you")({
  head: () => ({
    meta: [
      { title: "Thank You | Nutrion Life" },
      {
        name: "description",
        content: "Your order has been received. Thank you for shopping with us.",
      },
      { property: "og:title", content: "Thank You | Nutrion Life" },
      {
        property: "og:description",
        content: "Your order has been received. Thank you for shopping with us.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  return (
    <div className="min-h-screen bg-co-bg text-co-fg">
      <header className="border-b border-co-border bg-co-bg">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-center px-[14px] lg:px-10">
          <Link to="/" aria-label="Nutrion Life — back to store">
            <img
              src={logoAsset.url}
              alt="Nutrion Life"
              className="h-8 w-auto lg:h-10"
              width={4435}
              height={1826}
            />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col items-center px-[14px] py-20 text-center lg:px-10 lg:py-28">
        <span className="flex size-16 items-center justify-center rounded-full bg-co-savings">
          <CheckCircle2
            className="size-8 text-co-savings-fg"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </span>

        <h1 className="mt-6 text-3xl font-bold text-co-fg lg:text-4xl">
          Thank you for your order!
        </h1>

        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-co-muted">
          Your order has been received and is being processed. You'll receive
          your confirmation and shipping updates by email.
        </p>
      </main>
    </div>
  );
}