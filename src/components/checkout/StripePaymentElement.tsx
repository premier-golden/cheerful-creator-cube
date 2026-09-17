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
  postcode?: string | null;
  email?: string | null;
  onPaid?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: payError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        receipt_email: email?.trim() || undefined,
      },
    });
    if (payError) {
      setError(payError.message ?? "Payment failed. Please try another card.");
      setSubmitting(false);
      return;
    }
    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
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
              email: email?.trim() || undefined,
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
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-co-accent px-6 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
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
          <PayForm postcode={postcode} email={email} onPaid={onPaid} />
        </Elements>
      )}
    </div>
  );
}
