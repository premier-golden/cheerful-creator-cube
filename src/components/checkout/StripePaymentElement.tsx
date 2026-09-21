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

import { Loader2, RotateCcw } from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import {
  createStripePaymentIntent,
  updateStripePaymentIntent,
} from "@/lib/stripe.functions";
import { getAttribution } from "@/lib/attribution";
import {
  intentIdFromSecret,
  stripeErrorCode,
  trackCheckout,
} from "@/lib/checkout-tracking";
import { Button } from "@/components/ui/button";

/** This checkout sells to the United Kingdom only. */
const LOCALE = "en-GB" as const;

/** Client-side guard so the Pay button never hangs forever. */
const PREPARE_TIMEOUT_MS = 25000;
const BOOT_TIMEOUT_MS = 20000;
const ELEMENT_READY_TIMEOUT_MS = 20000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(message)),
      ms,
    );

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const stripeCache = new Map<
  string,
  Promise<Stripe | null>
>();

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

export type CheckoutValidator = () =>
  | string
  | null;

function PayForm({
  pack,
  shipping,
  email,
  clientSecret,
  formRef,
  validate,
  orderSummary,
  onPaid,
  onProcessing,
}: {
  pack: string;
  shipping: string | null;
  email: string | null;
  clientSecret: string;
  formRef: RefObject<HTMLFormElement | null>;
  validate?: CheckoutValidator | undefined;
  orderSummary?: ReactNode;
  onPaid?: (() => void) | undefined;
  onProcessing?: (() => void) | undefined;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const updateIntent = useServerFn(
    updateStripePaymentIntent,
  );

  const [submitting, setSubmitting] =
    useState(false);

  const [elementReady, setElementReady] =
    useState(false);

  const [elementError, setElementError] =
    useState<string | null>(null);

  const [error, setError] = useState<
    string | null
  >(null);

  const buyerEmail = email?.trim()
    ? email.trim()
    : null;

  /*
   * If Stripe's iframe is blocked (ad blocker,
   * in-app browser), the buyer must see a clear
   * error instead of an endless spinner.
   */
  useEffect(() => {
    if (elementReady) return;

    const timer = window.setTimeout(() => {
      setElementError(
        "The secure payment form could not be loaded. Check your connection or disable any blocker, then try again.",
      );
    }, ELEMENT_READY_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [elementReady]);

  async function handlePay() {
    if (submitting) return;

    if (!stripe || !elements) {
      setError(
        "The payment form is still loading. Please wait a moment and try again.",
      );
      return;
    }

    setError(null);

    /*
     * Field-level validation lives in the checkout
     * page: it highlights, focuses and scrolls to the
     * first invalid field and returns the message.
     */
    const validationError = validate?.();

    if (validationError) {
      setError(validationError);
      return;
    }

    const form = formRef.current;

    if (!form) {
      setError(
        "We couldn't read your delivery details. Please refresh and try again.",
      );
      return;
    }

    if (!shipping) {
      setError(
        "Please select a delivery method before paying.",
      );
      return;
    }

    const formData = new FormData(form);

    const value = (key: string) =>
      String(formData.get(key) ?? "").trim();

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

    setSubmitting(true);

    try {
      /*
       * Save the customer's order data in Supabase
       * BEFORE confirming payment. Stripe receives
       * only the resulting checkout_order_id, and the
       * server re-syncs the amount for the currently
       * selected shipping method.
       */
      const updated = await withTimeout(
        updateIntent({
          data: {
            clientSecret,
            pack,
            shipping,
            ...orderData,
            attribution: getAttribution(),
          },
        }),
        PREPARE_TIMEOUT_MS,
        "timeout",
      );

      if (!updated.ok) {
        setError(
          updated.error ??
            "We couldn't prepare your order. Please try again.",
        );

        setSubmitting(false);
        return;
      }

      /*
       * Pick up the server-side amount without
       * remounting the Payment Element.
       */
      try {
        await elements.fetchUpdates();
      } catch {
        /* Amount refresh is best-effort. */
      }

      const submitResult =
        await elements.submit();

      if (submitResult.error) {
        setError(
          submitResult.error.message ??
            "Please check your payment information.",
        );

        setSubmitting(false);
        return;
      }

      const confirm =
        stripe.confirmPayment as unknown as (
          options: Record<string, unknown>,
        ) => Promise<{
          error?: { message?: string };
          paymentIntent?: { status?: string };
        }>;

      /*
       * return_url is required for banks that
       * authenticate 3-D Secure through a redirect.
       * Returning to the current checkout URL keeps
       * pack and campaign parameters intact.
       */
      const returnUrl =
        window.location.href.split("#")[0] ??
        window.location.href;

      const result = await confirm({
        elements,
        clientSecret,
        redirect: "if_required",

        confirmParams: {
          return_url: returnUrl,
          ...(buyerEmail
            ? { receipt_email: buyerEmail }
            : {}),
        },
      });

      if (result.error) {
        setError(
          result.error.message ??
            "Payment failed. Please try another card.",
        );

        setSubmitting(false);
        return;
      }

      const status =
        result.paymentIntent?.status;

      if (status === "succeeded") {
        onPaid?.();
        return;
      }

      if (status === "processing") {
        onProcessing?.();
        return;
      }

      if (
        status === "requires_action" ||
        status === "requires_confirmation"
      ) {
        setError(
          "Your bank needs to authenticate this payment. Please complete the authentication and try again.",
        );

        setSubmitting(false);
        return;
      }

      setError(
        "The payment was not completed. Please check your card details and try again.",
      );

      setSubmitting(false);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error &&
          err.message === "timeout"
          ? "The payment is taking longer than expected. Nothing was charged — please tap Pay now to try again."
          : "We couldn't process your payment. Please try again.",
      );

      setSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-co-border bg-co-bg p-3.5 md:border-0 md:p-0">
      <PaymentElement
        onReady={() => {
          setElementReady(true);
          setElementError(null);
        }}
        onLoadError={() =>
          setElementError(
            "The secure payment form could not be loaded. Please refresh the page and try again.",
          )
        }
        options={{
          layout: "tabs",

          wallets: {
            link: "never",
          },

          /*
           * Do NOT pre-fill the delivery address
           * into Stripe's Payment Element.
           */
          defaultValues: {
            billingDetails: {
              address: {
                country: "GB",
              },
              ...(buyerEmail
                ? { email: buyerEmail }
                : {}),
            },
          },
        }}
      />

      {elementError && (
        <div className="mt-3">
          <p className="text-sm text-red-600">
            {elementError}
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              window.location.reload()
            }
            className="mt-2 flex h-10 items-center gap-2 rounded-xl text-sm"
          >
            <RotateCcw
              className="size-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            Try again
          </Button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-red-600"
        >
          {error}
        </p>
      )}

      {orderSummary && (
        <div className="mt-6 border-t border-co-border pt-6 lg:hidden">
          {orderSummary}
        </div>
      )}

      <Button
        type="button"
        onClick={handlePay}
        disabled={submitting}
        className="mt-5 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-co-cta px-6 text-base font-semibold text-co-bg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {submitting && (
          <Loader2
            className="size-4 animate-spin"
            strokeWidth={2}
            aria-hidden="true"
          />
        )}

        {submitting ? "Processing…" : "Pay now"}
      </Button>
    </div>
  );
}

/**
 * Mounts Stripe Payment Element inline.
 *
 * ARCHITECTURE: one PaymentIntent per checkout visit.
 *
 * Changing the shipping method or the postcode no
 * longer recreates the intent, so <Elements> is never
 * remounted and card data typed by the buyer survives.
 * The server recalculates and writes the final amount
 * right before confirmation.
 */
export function StripePaymentElement({
  pack,
  shipping,
  postcode: _postcode,
  email,
  formRef,
  validate,
  orderSummary,
  onPaid,
  onProcessing,
}: {
  pack: string;
  shipping?: string | null;
  postcode?: string | null;
  email?: string | null;
  formRef: RefObject<HTMLFormElement | null>;
  validate?: CheckoutValidator;
  orderSummary?: ReactNode;
  onPaid?: () => void;
  onProcessing?: () => void;
}) {
  const createIntent = useServerFn(
    createStripePaymentIntent,
  );

  const bootedRef = useRef<string | null>(
    null,
  );

  const [attempt, setAttempt] = useState(0);

  const [status, setStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const [error, setError] = useState<
    string | null
  >(null);

  const [clientSecret, setClientSecret] =
    useState<string | null>(null);

  const [publishableKey, setPublishableKey] =
    useState<string | null>(null);

  const buyerEmail = email?.trim()
    ? email.trim()
    : undefined;

  const retry = useCallback(() => {
    bootedRef.current = null;
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    /*
     * The intent is bound to the pack only. Shipping
     * changes are applied server-side at payment time.
     */
    const bootKey = `${pack}|${attempt}`;

    if (bootedRef.current === bootKey) {
      return;
    }

    bootedRef.current = bootKey;

    async function boot() {
      setStatus("loading");
      setError(null);

      try {
        const result = await withTimeout(
          createIntent({
            data: {
              pack,
              shipping: null,
              email: buyerEmail,
            },
          }),
          BOOT_TIMEOUT_MS,
          "timeout",
        );

        if (cancelled) return;

        if (!result.ok) {
          setError(result.error);
          setStatus("error");
          return;
        }

        setClientSecret(result.clientSecret);
        setPublishableKey(
          result.publishableKey,
        );
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;

        console.error(err);

        setError(
          "We couldn't load the payment form. Please check your connection and try again.",
        );

        setStatus("error");
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, attempt]);

  const stripePromise = useMemo(
    () =>
      publishableKey
        ? getStripe(publishableKey)
        : null,
    [publishableKey],
  );

  return (
    <div style={{ colorScheme: "light" }}>
      {status === "loading" && (
        <div className="flex items-center gap-2 py-6 text-sm text-co-muted">
          <Loader2
            className="size-4 animate-spin"
            strokeWidth={2}
            aria-hidden="true"
          />
          Loading secure payment…
        </div>
      )}

      {status === "error" && (
        <div className="py-4">
          <p
            role="alert"
            className="text-sm text-red-600"
          >
            {error ??
              "We couldn't load the payment form."}
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={retry}
            className="mt-3 flex h-10 items-center gap-2 rounded-xl text-sm"
          >
            <RotateCcw
              className="size-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            Try again
          </Button>
        </div>
      )}

      {status === "ready" &&
        clientSecret &&
        stripePromise && (
          <Elements
            key={clientSecret}
            stripe={stripePromise}
            options={{
              clientSecret,
              locale: LOCALE,

              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#1d3f42",
                  borderRadius: "12px",
                  fontFamily:
                    "Poppins, sans-serif",
                },
              },
            }}
          >
            <PayForm
              pack={pack}
              shipping={shipping ?? null}
              email={email ?? null}
              clientSecret={clientSecret}
              formRef={formRef}
              validate={validate}
              orderSummary={orderSummary}
              onPaid={onPaid}
              onProcessing={onProcessing}
            />
          </Elements>
        )}
    </div>
  );
}
