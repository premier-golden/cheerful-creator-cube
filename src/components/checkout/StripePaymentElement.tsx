import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { createStripePaymentIntent, updateStripePaymentIntent } from "@/lib/stripe.functions";

/** This checkout sells to the United Kingdom only. */
const LOCALE = "en-GB" as const;
const BILLING_COUNTRY = "GB";

const stripeCache = new Map<string, Promise<Stripe | null>>();

function getStripe(publishableKey: string) {
  let promise = stripeCache.get(publishableKey);

  if (!promise) {
    promise = loadStripe(publishableKey, {
      locale: LOCALE,
    });

    stripeCache.set(publishableKey, promise);
  }

  return promise;
}

function PayForm({
  postcode,
  email,
  clientSecret,
  onPaid,
}: {
  postcode: string | null;
  email: string | null;
  clientSecret: string;
  onPaid?: (() => void) | undefined;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const updateIntent = useServerFn(updateStripePaymentIntent);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const buyerEmail = email?.trim() ? email.trim() : null;

  async function handlePay() {
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    /*
     * StripePaymentElement is rendered inside the checkout
     * <form>. Read the buyer's latest delivery information
     * immediately before confirming the payment.
     */
    const paymentContainer = document.activeElement?.closest("form") ?? document.querySelector("form");

    if (!(paymentContainer instanceof HTMLFormElement)) {
      setError("We couldn't read your delivery details. Please refresh and try again.");
      setSubmitting(false);
      return;
    }

    const formData = new FormData(paymentContainer);

    const value = (key: string) => String(formData.get(key) ?? "").trim();

    const orderData = {
      email: value("email"),
      firstName: value("firstName"),
      lastName: value("lastName"),
      country: value("country"),
      postalCode: value("postalCode"),
      street: value("street"),
      apartment: value("apartment"),
      city: value("city"),
      phone: value("phone"),
    };

    /*
     * Do not allow Stripe confirmation until the delivery
     * information required to create the Shopify order exists.
     */
    if (
      !orderData.email ||
      !orderData.firstName ||
      !orderData.lastName ||
      !orderData.country ||
      !orderData.postalCode ||
      !orderData.street ||
      !orderData.city
    ) {
      setError("Please complete your contact and delivery information before paying.");
      setSubmitting(false);
      return;
    }

    try {
      /*
       * Save the latest customer/address information into
       * the existing PaymentIntent BEFORE charging the card.
       */
      const updated = await updateIntent({
        data: {
          clientSecret,
          ...orderData,
        },
      });

      if (!updated.ok) {
        setError(updated.error ?? "We couldn't prepare your order. Please try again.");
        setSubmitting(false);
        return;
      }

      /*
       * Ask Stripe Elements to validate its own fields before
       * attempting payment confirmation.
       */
      const submitResult = await elements.submit();

      if (submitResult.error) {
        setError(submitResult.error.message ?? "Please check your payment information.");
        setSubmitting(false);
        return;
      }

      /*
       * Card-only payments normally stay on this page.
       */
      const confirm = stripe.confirmPayment as unknown as (options: Record<string, unknown>) => Promise<{
        error?: {
          message?: string;
        };
        paymentIntent?: {
          status?: string;
        };
      }>;

      const result = await confirm({
        elements,
        clientSecret,
        redirect: "if_required",
        confirmParams: buyerEmail
          ? {
              receipt_email: buyerEmail,
            }
          : {},
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
    } catch (err) {
      console.error(err);

      setError("We couldn't process your payment. Please try again.");

      setSubmitting(false);
    }
  }

  return (
    <div>
      <PaymentElement
        options={{
          layout: "tabs",

          // Hide Stripe Link entirely.
          wallets: {
            link: "never",
          },

          defaultValues: {
            billingDetails: {
              ...(buyerEmail
                ? {
                    email: buyerEmail,
                  }
                : {}),

              address: {
                country: BILLING_COUNTRY,

                ...(postcode
                  ? {
                      postal_code: postcode,
                    }
                  : {}),
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
 * Mounts the Stripe Payment Element inline on the
 * checkout page.
 *
 * A fresh PaymentIntent is created whenever the pack
 * or delivery option changes.
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

    if (bootedRef.current === bootKey) {
      return;
    }

    bootedRef.current = bootKey;

    async function boot() {
      setStatus("loading");
      setError(null);

      try {
        const result = await createIntent({
          data: {
            pack,
            shipping: shipping ?? null,
            email: buyerEmail,
          },
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

  const stripePromise = useMemo(() => (publishableKey ? getStripe(publishableKey) : null), [publishableKey]);

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
            appearance: {
              theme: "stripe",
            },
          }}
        >
          <PayForm postcode={postcode ?? null} email={email ?? null} clientSecret={clientSecret} onPaid={onPaid} />
        </Elements>
      )}
    </div>
  );
}
