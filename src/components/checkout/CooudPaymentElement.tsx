import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { createCooudPaymentSession } from "@/lib/cooud.functions";

const ELEMENTS_SRC = "https://cdn.cooud.com/cdn/elements/v1.js";
const STRIPE_JS_URL = "https://js.stripe.com/v3";
/** This checkout sells to the United Kingdom only. */
const STRIPE_LOCALE = "en-GB";
const BILLING_COUNTRY = "GB";
/**
 * Cooud Elements talks to the Cooud API straight from the browser (the confirm
 * call is authenticated by the opaque session secret, no keys involved). We
 * route it through our own same-origin passthrough proxy so the REAL Cooud
 * status/error is logged server-side and shown to the buyer, instead of the
 * SDK's generic "Payment failed. Try another card…" message.
 */
const API_BASE_PATH = "/api/public/cooud-api";

type CooudElements = {
  mount: (options: Record<string, unknown>) => unknown;
};

type StripeFactory = ((...args: unknown[]) => StripeInstance | null) & {
  __ukLocalePatched?: boolean;
};
type StripeInstance = {
  elements?: (options?: Record<string, unknown>) => {
    create?: (type: string, options?: Record<string, unknown>) => unknown;
  } | null;
};

declare global {
  interface Window {
    __CooudElements__?: CooudElements;
    /** Set by https://js.stripe.com/v3 once loaded. */
    Stripe?: StripeFactory;
  }
}

/**
 * The Cooud SDK builds the Stripe Payment Element itself and never forwards a
 * locale or a billing country, so Stripe falls back to the visitor's browser
 * language and geo-IP country (that's why the card form showed Portuguese
 * labels and "Netherlands"/"Brasil"). Cooud calls `window.Stripe(pk)`, so we
 * wrap that factory and:
 *   - pass `locale: "en-GB"` to the Stripe constructor and to `elements()`
 *   - default the billing country of the payment element to GB
 * Stripe freezes its instances, so the wrapping is done with Proxies rather
 * than property assignment. Nothing else about the payment flow changes.
 */
/**
 * Billing postcode used to prefill the card form. With `country: "GB"` Stripe
 * REQUIRES a postal code in the card element; while that field is empty the
 * tokenisation step throws in the browser and Cooud never issues the
 * `/confirm` request — which is exactly why nothing showed up in the Cooud
 * dashboard with United Kingdom selected (Brazil needs no postcode, so it
 * worked). Prefilling it from the delivery address keeps the element complete.
 */
let ukPostcode: string | undefined;

export function setUkBillingPostcode(value: string | undefined) {
  ukPostcode = value?.trim() ? value.trim().toUpperCase() : undefined;
}

function withUkDefaults(createOptions: Record<string, unknown>) {
  const defaults = (createOptions["defaultValues"] ?? {}) as Record<string, unknown>;
  const billing = (defaults["billingDetails"] ?? {}) as Record<string, unknown>;
  const address = (billing["address"] ?? {}) as Record<string, unknown>;
  // NOTE: never set `fields.billingDetails.address.postalCode: "never"` here.
  // Stripe then REQUIRES the postal code to be supplied in the confirmation
  // params, and Cooud only sends email/name/phone — so createConfirmationToken
  // threw client-side and no confirm request ever reached Cooud (nothing in
  // the Cooud dashboard). The field stays visible so every attempt is sent.
  return {
    ...createOptions,
    defaultValues: {
      ...defaults,
      billingDetails: {
        ...billing,
        address: {
          ...address,
          country: BILLING_COUNTRY,
          ...(ukPostcode ? { postal_code: ukPostcode, postalCode: ukPostcode } : {}),
        },
      },
    },
  };
}

/**
 * `stripe.elements` is a GETTER-only property on the instance, so the previous
 * `stripe.elements = …` assignment was silently ignored and the UK defaults
 * never reached the payment element (the card form kept the geo-IP country and
 * showed no prefilled postcode). It is `configurable`, so we override it with
 * `Object.defineProperty`. `elements.create` is a normal writable property.
 * No Proxies: `stripe.createConfirmationToken({ elements })` needs the genuine
 * Stripe/Elements instances.
 */
function patchElementsCreate(elements: object): object {
  const holder = elements as {
    create?: (type: string, options?: Record<string, unknown>) => unknown;
    __ukCreatePatched?: boolean;
  };
  if (typeof holder.create !== "function" || holder.__ukCreatePatched) return elements;
  const original = holder.create.bind(elements);
  try {
    Object.defineProperty(holder, "create", {
      configurable: true,
      writable: true,
      value: (type: string, createOptions: Record<string, unknown> = {}) =>
        original(type, type === "payment" ? withUkDefaults(createOptions) : createOptions),
    });
    holder.__ukCreatePatched = true;
  } catch {
    /* keep Stripe's defaults rather than break the payment */
  }
  return elements;
}

function wrapStripeFactory(original: StripeFactory): StripeFactory {
  if (original.__ukLocalePatched) return original;
  const wrapped: StripeFactory = (...args: unknown[]) => {
    const [pk, opts, ...rest] = args;
    const stripe = original.apply(null, [
      pk,
      { ...((opts as Record<string, unknown>) ?? {}), locale: STRIPE_LOCALE },
      ...rest,
    ]);
    if (!stripe) return stripe;
    const elementsFn = stripe.elements;
    if (typeof elementsFn === "function") {
      try {
        Object.defineProperty(stripe, "elements", {
          configurable: true,
          writable: true,
          value: (options: Record<string, unknown> = {}) => {
            const elements = elementsFn.call(stripe, { locale: STRIPE_LOCALE, ...options });
            return elements ? (patchElementsCreate(elements) as never) : elements;
          },
        });
      } catch {
        /* locale from the constructor still applies */
      }
    }
    return stripe;
  };

  Object.assign(wrapped, original);
  wrapped.__ukLocalePatched = true;
  return wrapped;
}


/**
 * Cooud loads its own copy of Stripe.js and calls `Stripe(pk)` as soon as the
 * script is ready — possibly before any of our promises resolve. So we hook the
 * `window.Stripe` property itself (synchronously, before the SDKs load) and wrap
 * whatever Stripe.js assigns to it, guaranteeing the en-GB locale is applied.
 */
function installStripeLocaleHook() {
  if (typeof window === "undefined") return;
  const win = window as Window & { __ukStripeHook?: boolean };
  if (win.__ukStripeHook) return;
  win.__ukStripeHook = true;
  let current = window.Stripe ? wrapStripeFactory(window.Stripe) : undefined;
  try {
    Object.defineProperty(window, "Stripe", {
      configurable: true,
      get: () => current,
      set: (value: StripeFactory | undefined) => {
        current = typeof value === "function" ? wrapStripeFactory(value) : value;
      },
    });
  } catch {
    if (window.Stripe) window.Stripe = wrapStripeFactory(window.Stripe);
  }
}

function loadStripeWithUkLocale(): Promise<void> {
  installStripeLocaleHook();
  if (window.Stripe) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${STRIPE_JS_URL}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener(
      "load",
      () => (window.Stripe ? resolve() : reject(new Error("Stripe.js did not initialise"))),
      { once: true },
    );
    script.addEventListener("error", () => reject(new Error("Could not load Stripe.js")), {
      once: true,
    });
    if (!existing) {
      script.src = STRIPE_JS_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/**
 * Cooud Elements resolves its own theme from `appearance.theme`. It only
 * accepts "light" or "dark" — any other value falls back to "auto", which
 * respects the browser's color scheme (and picks dark on dark-mode devices).
 * Our checkout is a white/light surface, so we force "light" here. Cooud then
 * applies its own clean light styling (white background, #e5e5e7 borders,
 * #fafafa inputs) — no need to pass Stripe variables/rules; they are ignored.
 */
const LIGHT_APPEARANCE = { theme: "light" as const };

function loadElements(): Promise<CooudElements> {
  if (window.__CooudElements__) return Promise.resolve(window.__CooudElements__);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${ELEMENTS_SRC}"]`);
    const script = existing ?? document.createElement("script");
    const onLoad = () => {
      if (window.__CooudElements__) resolve(window.__CooudElements__);
      else reject(new Error("Cooud Elements did not initialise"));
    };
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", () => reject(new Error("Could not load Cooud Elements")), {
      once: true,
    });
    if (!existing) {
      script.src = ELEMENTS_SRC;
      script.async = true;
      document.head.appendChild(script);
    } else if (window.__CooudElements__) {
      onLoad();
    }
  });
}

/**
 * Mounts the Cooud payment component (API v2 custom checkout) inline, in place
 * of the old credit-card form + "Pay now" button. No redirect: the buyer stays
 * on this checkout page.
 */
export function CooudPaymentElement({
  pack,
  shipping,
  postcode,
  email,
  getEmail,
  onPaid,
}: {
  pack: string;
  /** Selected shipping method id — charged in the Cooud session total. */
  shipping?: string | null;
  /** Valid UK delivery postcode — prefills the card's required billing postcode. */
  postcode?: string | null;
  /**
   * Buyer email. Cooud reads `customerEmail` ONCE at mount time and sends it as
   * `customer_email` in the confirm request; the API rejects the confirm with
   * HTTP 422 `parameter_invalid` ("The argument 'customer_email' is required…")
   * when it is missing — and a rejected confirm never creates a transaction in
   * the Cooud dashboard. So the element is only mounted once we have an email,
   * and it is remounted when the email changes.
   */
  email?: string | null;
  getEmail?: () => string | undefined;
  onPaid?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bootedPackRef = useRef<string | null>(null);
  const createSession = useServerFn(createCooudPaymentSession);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const buyerEmail = email?.trim() ? email.trim() : undefined;

  useEffect(() => {
    let cancelled = false;
    // The session total depends on the pack AND the selected delivery option,
    // so a shipping change must create a fresh session. The buyer email is part
    // of the key because Cooud snapshots it at mount and the confirm request is
    // rejected (422) without it. The guard still stops React's double-invoke in
    // dev from creating two identical sessions.
    const bootKey = `${pack}|${shipping ?? "none"}|${postcode ?? ""}|${buyerEmail ?? ""}`;
    if (bootedPackRef.current === bootKey) return;
    bootedPackRef.current = bootKey;
    // Applied when Cooud creates the Stripe payment element below.
    setUkBillingPostcode(postcode ?? undefined);


    async function boot() {
      setStatus("loading");
      setError(null);
      try {
        const [elements, , session] = await Promise.all([
          loadElements(),
          loadStripeWithUkLocale(),
          createSession({
            data: {
              pack,
              shipping: shipping ?? null,
              email: buyerEmail,
              origin: window.location.origin,
            },
          }),
        ]);
        if (cancelled) return;
        if (!session.ok) {
          setError(session.error);
          setStatus("error");
          return;
        }
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";
        // The Stripe Payment Element (rendered inside Cooud's container) reads
        // `prefers-color-scheme` from its embedding context, NOT Cooud's
        // `appearance.theme`. Pinning `color-scheme: light` on the container
        // makes the Stripe iframe resolve a light scheme regardless of the
        // visitor's OS dark-mode setting, so card fields stay white.
        container.style.colorScheme = "light";
        // Buyer identity: Cooud reads these at submit time and puts them into
        // the card billing_details and the confirm payload (customer_email /
        // customer_country). `customerEmail` is a lazy getter so the value is
        // whatever the buyer has typed when they press Pay, not at mount.
        const mountOptions: Record<string, unknown> = {
          container,
          sessionId: session.sessionId,
          elementToken: session.elementToken,
          sessionSecret: session.sessionSecret,
          customerCountry: BILLING_COUNTRY,
          // Different Cooud SDK builds read different keys for the buyer's
          // country; pass all of them so Country/Territory defaults to the UK.
          country: BILLING_COUNTRY,
          billingCountry: BILLING_COUNTRY,
          defaultCountry: BILLING_COUNTRY,
          // UK billing postcode (Stripe requires it when country is GB).
          ...(postcode
            ? {
                customerPostalCode: postcode,
                postalCode: postcode,
                postcode,
              }
            : {}),

          // Cooud's buyerLanguage() reads locale/lang for its own buyer-facing
          // messages — force English (UK) instead of the browser's language.
          locale: STRIPE_LOCALE,
          lang: STRIPE_LOCALE,
          // Force light: Cooud's resolveTheme only honours theme:"light"|"dark".
          appearance: LIGHT_APPEARANCE,
          apiBaseUrl: `${window.location.origin}${API_BASE_PATH}`,
          onSuccess: () => onPaid?.(),
          onComplete: () => onPaid?.(),
          onError: (err: unknown) => {
            console.error("Cooud payment error", JSON.stringify(err, Object.getOwnPropertyNames(err ?? {})).slice(0, 600));
            const e = (err ?? {}) as {
              param?: string;
              code?: string;
              decline_code?: string;
              request_id?: string;
              message?: string;
            };
            // `param` carries the real Cooud status + message (injected by our
            // proxy). Errors raised before the request reaches Cooud (e.g. the
            // card tokenisation step) only have a code — show it too, so the
            // failure is never hidden behind a generic message.
            const detail =
              e.param && e.param.includes("HTTP")
                ? e.param
                : [e.code, e.decline_code, e.message, e.request_id]
                    .filter(Boolean)
                    .join(" · ");
            setError(detail || "Payment failed. Please try another card.");
          },
        };
        // Plain values (not a getter): Cooud snapshots the email at mount, so a
        // lazy getter read before the buyer typed produced an empty
        // `customer_email` and Cooud rejected the confirm with 422 — no
        // transaction was ever created. Several SDK builds read different keys.
        const emailNow = buyerEmail ?? getEmail?.();
        if (emailNow) {
          mountOptions["customerEmail"] = emailNow;
          mountOptions["customer_email"] = emailNow;
          mountOptions["email"] = emailNow;
        }
        elements.mount(mountOptions);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("We couldn't load the payment component. Please refresh and try again.");
        setStatus("error");
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, shipping, postcode, buyerEmail]);

  useEffect(() => {
    function handle() {
      onPaid?.();
    }
    window.addEventListener("cooud:checkout_complete", handle);
    return () => window.removeEventListener("cooud:checkout_complete", handle);
  }, [onPaid]);

  return (
    <div>
      {status === "loading" && (
        <div className="flex items-center gap-2 py-6 text-sm text-co-muted">
          <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden="true" />
          Loading secure payment…
        </div>
      )}
      {error && <p className="py-4 text-sm text-red-600">{error}</p>}
      <div ref={containerRef} />
    </div>
  );
}
