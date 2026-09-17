import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { createStripePaymentIntent } from "@/lib/stripe.functions";

/** This checkout sells to the United Kingdom only. */
const LOCALE = "en-GB" as const;
const BILLING_COUNTRY = "GB";

const stripeCache = new Map<string, Promise<Stripe | null>>();

function getStripe(publishableKey: string) {
  let promise = stripeCache.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey, { locale: LOCALE });
    stripeCache.set(publishableKey, promise);
  }
  return promise;
}

function PayForm({
  postcode,
  email,
  onPaid,
}: {
  postcode: string | null;
  email: string | null;
  onPaid?: (() => void) | undefined;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buyerEmail = email?.trim() ? email.trim() : null;

  async function handlePay() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    // `redirect: "if_required"` keeps the buyer on this page for card payments;
    // the SDK's overloads don't model it together with `elements`, hence the cast.
    const confirm = stripe.confirmPayment as unknown as (
      options: Record<string, unknown>,
    ) => Promise<{
      error?: { message?: string };
      paymentIntent?: { status?: string };
    }>;
    const result = await confirm({
      elements,
      redirect: "if_required",
      confirmParams: buyerEmail ? { receipt_email: buyerEmail } : {},
    });
    if (result.error) {
      setError(result.error.message ?? "Payment failed. Please try another card.");
      setSubmitting(false);
      return;
    }
    const intent = result.paymentIntent;
    if (intent && (intent.status === "succeeded" || intent.status === "processing")) {
      onPaid?.();
      return;
    }
    setSubmitting(false);
  }

  return (
    <div>
      <PaymentElement
        options={{
          layout: "tabs",
          defaultValues: {
            billingDetails: {
              ...(buyerEmail ? { email: buyerEmail } : {}),
              address: {
                country: BILLING_COUNTRY,
                ...(postcode ? { postal_code: postcode } : {}),
              },
            },
          },
        }}
      />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handlePay}
        disabled={submitting || !stripe || !elements}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#ef7a1a] px-6 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {submitting && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden="true" />}
        {submitting ? "Processing…" : "Pay now"}
      </button>
    </div>
  );
}

/**
 * Mounts the Stripe Payment Element inline on the checkout page (no redirect).
 * A fresh PaymentIntent is created whenever the pack or delivery option
 * changes, so the charged total always matches the order summary.
 */
export function StripePaymentElement({
  pack,
  shipping,
  postcode,
  email,
  onPaid,
}: {
  pack: string;
  shipping?: string | null;
  postcode?: string | null;
  email?: string | null;
  onPaid?: () => void;
}) {
  const createIntent = useServerFn(createStripePaymentIntent);
  const bootedRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  const buyerEmail = email?.trim() ? email.trim() : undefined;

  useEffect(() => {
    let cancelled = false;
    const bootKey = `${pack}|${shipping ?? "none"}`;
    if (bootedRef.current === bootKey) return;
    bootedRef.current = bootKey;

    async function boot() {
      setStatus("loading");
      setError(null);
      try {
        const result = await createIntent({
          data: { pack, shipping: shipping ?? null, email: buyerEmail },
        });
        if (cancelled) return;
        if (!result.ok) {
          setError(result.error);
          setStatus("error");
          return;
        }
        setClientSecret(result.clientSecret);
        setPublishableKey(result.publishableKey);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("We couldn't load the payment form. Please refresh and try again.");
        setStatus("error");
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, shipping]);

  const stripePromise = useMemo(
    () => (publishableKey ? getStripe(publishableKey) : null),
    [publishableKey],
  );

  return (
    <div style={{ colorScheme: "light" }}>
      {status === "loading" && (
        <div className="flex items-center gap-2 py-6 text-sm text-co-muted">
          <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden="true" />
          Loading secure payment…
        </div>
      )}
      {error && <p className="py-4 text-sm text-red-600">{error}</p>}
      {status === "ready" && clientSecret && stripePromise && (
        <Elements
          key={clientSecret}
          stripe={stripePromise}
          options={{
            clientSecret,
            locale: LOCALE,
            appearance: { theme: "stripe" },
          }}
        >
          <PayForm postcode={postcode ?? null} email={email ?? null} onPaid={onPaid} />
        </Elements>
      )}
    </div>
  );
}
