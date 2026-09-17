import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Truck, ShieldCheck, ShoppingBag, Loader2, CheckCircle2, CircleHelp } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { submitOrder } from "@/lib/order.functions";
import { tiktokIdentify, tiktokTrack } from "@/lib/tiktok";
import {
  getBundle,
  DEFAULT_BUNDLE_ID,
  SHIPPING_METHODS,
  isValidUkPostcode,
  formatAmount,
  parseAmount,
} from "@/lib/offer";

import logoAsset from "@/assets/nutrition-geeks-logo.png.asset.json";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { CooudPaymentElement } from "@/components/checkout/CooudPaymentElement";
import { AddressAutocomplete } from "@/components/checkout/AddressAutocomplete";
import {
  Field,
  SelectField,
  CheckLine,
  SectionTitle,
} from "@/components/checkout/CheckoutFields";

/**
 * CHECKOUT — independent area of the project.
 * It only depends on `@/lib/offer` (the pack list) so the Main Offer and the
 * Checkout can be edited separately without breaking each other.
 */
export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>) => ({
    pack: search["pack"] == null ? DEFAULT_BUNDLE_ID : String(search["pack"]),
  }),
  head: () => ({
    meta: [
      { title: "Checkout | Nutrition Geeks" },
      {
        name: "description",
        content:
          "Secure checkout for your Collagen Glow Up Powder order. All transactions are encrypted.",
      },
      { property: "og:title", content: "Checkout | Nutrition Geeks" },
      {
        property: "og:description",
        content: "Complete your Nutrition Geeks order on our secure, encrypted checkout.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const COUNTRIES = ["United Kingdom"];



function CheckoutPage() {
  const { pack } = Route.useSearch();
  const bundle = getBundle(pack);
  const placeOrder = useServerFn(submitOrder);
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [postcode, setPostcode] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  // Cooud requires customer_email on the confirm call, so the payment element
  // is only mounted once a valid email is present.
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const [shippingId, setShippingId] = useState<string | null>(null);
  const postcodeValid = isValidUkPostcode(postcode);
  const shipping =
    (postcodeValid && SHIPPING_METHODS.find((m) => m.id === shippingId)) || null;
  // ---- TikTok Pixel conversion tracking -------------------------------------
  const orderTotal = parseAmount(bundle.price) + (shipping?.amount ?? 0);
  const tiktokContents = [
    {
      content_id: bundle.id,
      content_name: bundle.productName ?? bundle.title,
      content_type: "product" as const,
      quantity: bundle.quantity ?? 1,
      price: parseAmount(bundle.price),
    },
  ];

  // Fires once per checkout visit.
  const initiatedRef = useRef(false);
  useEffect(() => {
    if (initiatedRef.current) return;
    initiatedRef.current = true;
    tiktokTrack("InitiateCheckout", {
      value: parseAmount(bundle.price),
      contents: tiktokContents,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack]);

  // Buyer identity improves TikTok's attribution matching for the sale.
  useEffect(() => {
    if (emailValid) tiktokIdentify(email);
  }, [email, emailValid]);

  /** Fired by the Cooud payment component once the payment is approved. */
  const handlePaid = useCallback(async () => {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    setStatus("loading");
    setError(null);
    // Track the purchase as soon as the payment is approved — independent of
    // our own order registration, so a webhook hiccup never loses the sale.
    tiktokIdentify(value("email"), value("phone"));
    tiktokTrack("CompletePayment", {
      value: orderTotal,
      contents: tiktokContents,
    });
    try {
      const result = await placeOrder({
        data: {
          pack,
          email: value("email"),
          firstName: value("firstName"),
          lastName: value("lastName"),
          country: value("country"),
          postalCode: value("postalCode"),
          street: value("street"),
          apartment: value("apartment"),
          city: value("city"),
          phone: value("phone"),
        },
      });
      setOrderNumber(result.orderNumber);
      setStatus("done");
    } catch {
      setStatus("idle");
      setError("Payment approved, but we couldn't register your order. Please contact support.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, placeOrder, orderTotal]);


  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }



  return (
    <div className="min-h-screen bg-co-bg text-co-fg">
      {/* Header */}
      <header className="border-b border-co-border bg-white">
        <div className="relative mx-auto flex h-[72px] max-w-[1200px] items-center justify-center px-5 lg:px-10">
          <Link to="/" aria-label="Nutrition Geeks — back to store">
            <img
              src={logoAsset.url}
              alt="Nutrition Geeks"
              className="h-9 w-auto lg:h-10"
              width={4435}
              height={1826}
            />
          </Link>
          <Link
            to="/"
            aria-label="Back to store"
            className="absolute right-5 top-1/2 -translate-y-1/2 text-co-accent hover:opacity-80 lg:right-10"
          >
            <ShoppingBag className="size-6" strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </header>


      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16 lg:px-10 lg:py-12">
        {/* LEFT: form */}
        <main className="min-w-0">
          <h1 className="sr-only">Checkout</h1>

          <form ref={formRef} onSubmit={handleSubmit}>

          {/* Contact */}
          <section className="mt-2">
            <div className="mb-3">
              <SectionTitle>Contact</SectionTitle>
            </div>
            <Field
              label="Email"
              type="email"
              name="email"
              required
              autoComplete="email"
              onChange={setEmail}
            />
            <div className="mt-3">
              <CheckLine>Email me with news and offers</CheckLine>
            </div>
          </section>

          {/* Delivery */}
          <section className="mt-8">
            <SectionTitle>Delivery</SectionTitle>
            <div className="space-y-3">
              <SelectField label="Country/Region" name="country" options={COUNTRIES} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" name="firstName" required autoComplete="given-name" />
                <Field label="Last name" name="lastName" required autoComplete="family-name" />
              </div>
              <AddressAutocomplete
                label="Address"
                name="street"
                required
                value={street}
                onValueChange={setStreet}
                onSelect={(s) => {
                  setStreet(s.street || s.label);
                  if (s.city) setCity(s.city);
                  if (s.postcode) setPostcode(s.postcode);
                }}
              />
              <Field
                label="Apartment, suite, etc. (optional)"
                name="apartment"
                autoComplete="address-line2"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="City"
                  name="city"
                  required
                  autoComplete="address-level2"
                  value={city}
                  onChange={setCity}
                />
                <Field
                  label="Postcode"
                  name="postalCode"
                  required
                  autoComplete="postal-code"
                  value={postcode}
                  onChange={setPostcode}
                />
              </div>

              <Field
                label="Phone (optional)"
                type="tel"
                name="phone"
                autoComplete="tel"
                icon={<CircleHelp className="size-4" strokeWidth={1.75} aria-hidden="true" />}
              />
              <CheckLine>Save this information for next time</CheckLine>
            </div>
          </section>

          {/* Shipping method */}
          <section className="mt-8">
            <SectionTitle>Shipping method</SectionTitle>
            {postcodeValid ? (
              <div
                role="radiogroup"
                aria-label="Shipping method"
                className="divide-y divide-co-border overflow-hidden rounded-xl border border-co-border bg-co-bg"
              >
                {SHIPPING_METHODS.map((method) => {
                  const selected = shippingId === method.id;
                  return (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-4 text-sm transition-colors ${
                        selected ? "bg-co-surface" : "hover:bg-co-surface/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        value={method.id}
                        required
                        checked={selected}
                        onChange={() => setShippingId(method.id)}
                        className="size-4 accent-[var(--co-accent)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-co-fg">{method.label}</span>
                        <span className="block text-xs text-co-muted">{method.description}</span>
                      </span>
                      <span className="shrink-0 text-sm font-medium text-co-fg">
                        {method.amount === 0 ? "Free" : formatAmount(method.amount)}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-md border border-co-border bg-co-surface px-4 py-5 text-sm text-co-muted">
                <Truck className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                Enter your shipping address to view available shipping methods.
              </div>
            )}
          </section>


          {/* Payment — Cooud Elements (API v2 custom checkout, inline) */}
          <section className="mt-8">
            <SectionTitle>Payment</SectionTitle>
            <p className="mb-3 text-sm text-co-muted">All transactions are secure and encrypted.</p>

            {status === "done" ? (
              <div className="rounded-md border border-co-border bg-co-surface p-5">
                <p className="flex items-center gap-2 text-sm font-medium text-co-fg">
                  <CheckCircle2 className="size-5 text-co-accent" strokeWidth={1.75} aria-hidden="true" />
                  Payment approved — order {orderNumber}
                </p>
                <p className="mt-2 text-sm text-co-muted">
                  Your details were sent to our tracking service. You'll receive your tracking
                  code by email as soon as the parcel is dispatched.
                </p>
              </div>
            ) : (
              <>
                {/* Mounted as soon as the checkout loads. Email/postcode are
                    attached to the session as soon as the buyer types them
                    (the element re-boots with the new buyer data). */}
                <CooudPaymentElement
                  pack={pack}
                  shipping={shipping?.id ?? null}
                  postcode={postcodeValid ? postcode.trim().toUpperCase() : null}
                  email={emailValid ? email.trim() : null}
                  getEmail={() => {
                    const value = formRef.current?.elements.namedItem("email");
                    const typed =
                      value instanceof HTMLInputElement ? value.value.trim() : "";
                    return typed || undefined;
                  }}
                  onPaid={handlePaid}
                />

                {status === "loading" && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-co-muted">
                    <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden="true" />
                    Confirming your order…
                  </p>
                )}
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <p className="mt-4 flex items-center justify-center gap-2 text-xs text-co-muted">
                  <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  Secure and encrypted payment
                </p>
              </>
            )}
          </section>

          </form>

          <footer className="mt-10 border-t border-co-border pt-5 text-xs text-co-muted">
            <div className="flex flex-wrap gap-4">
              <a href="#" className="underline underline-offset-2">
                Refund policy
              </a>
              <a href="#" className="underline underline-offset-2">
                Shipping policy
              </a>
              <a href="#" className="underline underline-offset-2">
                Privacy policy
              </a>
              <a href="#" className="underline underline-offset-2">
                Terms of service
              </a>
            </div>
          </footer>
        </main>

        {/* RIGHT: order summary */}
        <aside className="min-w-0 lg:border-l lg:border-co-border lg:pl-16">
          <div className="lg:sticky lg:top-10">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-co-muted">
              <Lock className="size-4" strokeWidth={1.75} aria-hidden="true" />
              Order summary
            </h2>
            <CheckoutSummary bundle={bundle} shipping={shipping} />
          </div>
        </aside>
      </div>
    </div>
  );
}
