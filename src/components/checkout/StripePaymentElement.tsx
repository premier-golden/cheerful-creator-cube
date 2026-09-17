import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import {
  loadStripe,
  type Stripe,
} from "@stripe/stripe-js";

import { useServerFn } from "@tanstack/react-start";

import { Loader2 } from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createStripePaymentIntent,
  updateStripePaymentIntent,
} from "@/lib/stripe.functions";

/** This checkout sells to the United Kingdom only. */
const LOCALE = "en-GB" as const;

const stripeCache =
  new Map<
    string,
    Promise<Stripe | null>
  >();

function getStripe(
  publishableKey: string,
) {
  let promise =
    stripeCache.get(
      publishableKey,
    );

  if (!promise) {
    promise = loadStripe(
      publishableKey,
      {
        locale: LOCALE,
      },
    );

    stripeCache.set(
      publishableKey,
      promise,
    );
  }

  return promise;
}

function PayForm({
  pack,
  shipping,
  email,
  clientSecret,
  onPaid,
}: {
  pack: string;
  shipping: string | null;
  email: string | null;
  clientSecret: string;
  onPaid?:
    (() => void) | undefined;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const updateIntent =
    useServerFn(
      updateStripePaymentIntent,
    );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const buyerEmail =
    email?.trim()
      ? email.trim()
      : null;

  async function handlePay() {
    if (
      !stripe ||
      !elements
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);

    /*
     * Read the latest checkout information
     * immediately before payment.
     */
    const paymentContainer =
      document.activeElement
        ?.closest("form") ??
      document.querySelector(
        "form",
      );

    if (
      !(
        paymentContainer instanceof
        HTMLFormElement
      )
    ) {
      setError(
        "We couldn't read your delivery details. Please refresh and try again.",
      );

      setSubmitting(false);
      return;
    }

    const formData =
      new FormData(
        paymentContainer,
      );

    const value = (
      key: string,
    ) =>
      String(
        formData.get(key) ?? "",
      ).trim();

    const orderData = {
      email: value("email"),

      firstName:
        value("firstName"),

      lastName:
        value("lastName"),

      country:
        value("country"),

      postalCode:
        value("postalCode"),

      street:
        value("street"),

      apartment:
        value("apartment"),

      city:
        value("city"),

      phone:
        value("phone"),
    };

    if (
      !orderData.email ||
      !orderData.firstName ||
      !orderData.lastName ||
      !orderData.country ||
      !orderData.postalCode ||
      !orderData.street ||
      !orderData.city
    ) {
      setError(
        "Please complete your contact and delivery information before paying.",
      );

      setSubmitting(false);
      return;
    }

    if (!shipping) {
      setError(
        "Please select a delivery method before paying.",
      );

      setSubmitting(false);
      return;
    }

    try {
      /*
       * Save the customer's order data in
       * Supabase BEFORE confirming payment.
       *
       * Stripe receives only the resulting
       * checkout_order_id.
       */
      const updated =
        await updateIntent({
          data: {
            clientSecret,

            pack,
            shipping,

            ...orderData,
          },
        });

      if (!updated.ok) {
        setError(
          updated.error ??
            "We couldn't prepare your order. Please try again.",
        );

        setSubmitting(false);
        return;
      }

      /*
       * Validate Stripe's payment fields.
       */
      const submitResult =
        await elements.submit();

      if (
        submitResult.error
      ) {
        setError(
          submitResult.error
            .message ??
            "Please check your payment information.",
        );

        setSubmitting(false);
        return;
      }

      const confirm =
        stripe.confirmPayment as unknown as (
          options: Record<
            string,
            unknown
          >,
        ) => Promise<{
          error?: {
            message?: string;
          };

          paymentIntent?: {
            status?: string;
          };
        }>;

      /*
       * No shipping address is supplied here.
       *
       * Delivery information lives in Supabase.
       */
      const result =
        await confirm({
          elements,
          clientSecret,
          redirect:
            "if_required",

          confirmParams:
            buyerEmail
              ? {
                  receipt_email:
                    buyerEmail,
                }
              : {},
        });

      if (result.error) {
        setError(
          result.error.message ??
            "Payment failed. Please try another card.",
        );

        setSubmitting(false);
        return;
      }

      const intent =
        result.paymentIntent;

      if (
        intent &&
        (
          intent.status ===
            "succeeded" ||
          intent.status ===
            "processing"
        )
      ) {
        onPaid?.();
        return;
      }

      setSubmitting(false);
    } catch (err) {
      console.error(err);

      setError(
        "We couldn't process your payment. Please try again.",
      );

      setSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-co-border bg-co-bg p-3.5 md:border-0 md:p-0">
      <PaymentElement
        options={{
          layout: "tabs",

          wallets: {
            link: "never",
          },

          /*
           * Do NOT pre-fill the delivery address
           * into Stripe's Payment Element.
           *
           * Delivery data is stored in Supabase.
           */
          defaultValues: {
            billingDetails: {
              ...(buyerEmail
                ? {
                    email:
                      buyerEmail,
                  }
                : {}),
            },
          },
        }}
      />

      {error && (
        <p className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={
          submitting ||
          !stripe ||
          !elements
        }
        className="mt-5 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-co-cta px-6 text-base font-semibold text-co-bg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {submitting && (
          <Loader2
            className="size-4 animate-spin"
            strokeWidth={2}
            aria-hidden="true"
          />
        )}

        {submitting
          ? "Processing…"
          : "Pay now"}
      </button>
    </div>
  );
}

/**
 * Mounts Stripe Payment Element inline.
 *
 * A fresh PaymentIntent is created whenever
 * pack or shipping changes.
 */
export function StripePaymentElement({
  pack,
  shipping,
  postcode: _postcode,
  email,
  onPaid,
}: {
  pack: string;
  shipping?:
    string | null;
  postcode?:
    string | null;
  email?:
    string | null;
  onPaid?: () => void;
}) {
  const createIntent =
    useServerFn(
      createStripePaymentIntent,
    );

  const bootedRef =
    useRef<
      string | null
    >(null);

  const [
    status,
    setStatus,
  ] = useState<
    "loading" |
    "ready" |
    "error"
  >("loading");

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    clientSecret,
    setClientSecret,
  ] = useState<
    string | null
  >(null);

  const [
    publishableKey,
    setPublishableKey,
  ] = useState<
    string | null
  >(null);

  const buyerEmail =
    email?.trim()
      ? email.trim()
      : undefined;

  useEffect(() => {
    let cancelled = false;

    const bootKey =
      `${pack}|${shipping ?? "none"}`;

    if (
      bootedRef.current ===
      bootKey
    ) {
      return;
    }

    bootedRef.current =
      bootKey;

    async function boot() {
      setStatus("loading");
      setError(null);

      try {
        const result =
          await createIntent({
            data: {
              pack,

              shipping:
                shipping ??
                null,

              email:
                buyerEmail,
            },
          });

        if (cancelled) {
          return;
        }

        if (!result.ok) {
          setError(
            result.error,
          );

          setStatus(
            "error",
          );

          return;
        }

        setClientSecret(
          result.clientSecret,
        );

        setPublishableKey(
          result.publishableKey,
        );

        setStatus(
          "ready",
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(err);

        setError(
          "We couldn't load the payment form. Please refresh and try again.",
        );

        setStatus(
          "error",
        );
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, shipping]);

  const stripePromise =
    useMemo(
      () =>
        publishableKey
          ? getStripe(
              publishableKey,
            )
          : null,

      [publishableKey],
    );

  return (
    <div
      style={{
        colorScheme:
          "light",
      }}
    >
      {status ===
        "loading" && (
        <div className="flex items-center gap-2 py-6 text-sm text-co-muted">
          <Loader2
            className="size-4 animate-spin"
            strokeWidth={2}
            aria-hidden="true"
          />

          Loading secure payment…
        </div>
      )}

      {error && (
        <p className="py-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {status ===
        "ready" &&
        clientSecret &&
        stripePromise && (
          <Elements
            key={
              clientSecret
            }
            stripe={
              stripePromise
            }
            options={{
              clientSecret,
              locale:
                LOCALE,

              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#1d3f42",
                  borderRadius: "12px",
                  fontFamily: "Poppins, sans-serif",
                },
              },
            }}
          >
            <PayForm
              pack={pack}
              shipping={
                shipping ??
                null
              }
              email={
                email ??
                null
              }
              clientSecret={
                clientSecret
              }
              onPaid={
                onPaid
              }
            />
          </Elements>
        )}
    </div>
  );
}
