import { loadWhop } from "@whop/elements";
import {
  BrandingElement,
  CardElement,
  Payments,
  usePayments,
  WhopElements,
} from "@whop/elements-react";
import { useHydrated } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RotateCcw } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { getAttribution } from "@/lib/attribution";
import {
  getCheckoutSessionId,
  trackCheckout,
} from "@/lib/checkout-tracking";
import { BUNDLES, getShippingMethod, parseAmount } from "@/lib/offer";
import {
  createWhopPayment,
  getWhopConfig,
  getWhopPaymentStatus,
} from "@/lib/whop.functions";
import { Button } from "@/components/ui/button";

export type CheckoutValidator = () => string | null;

const PAY_TIMEOUT_MS = 30000;
const ELEMENT_READY_TIMEOUT_MS = 20000;

/** URL param set on the 3DS return URL so the checkout can re-check status. */
export const WHOP_RETURN_PARAM = "whop_payment_id";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        window.clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Display/gating amount only. The server recomputes the charge. */
function amountPence(pack: string, shipping: string | null) {
  const bundle = BUNDLES.find((b) => b.id === pack) ?? BUNDLES[0]!;
  const ship = getShippingMethod(shipping);
  return (
    Math.round(parseAmount(bundle.price) * 100) +
    Math.round((ship?.amount ?? 0) * 100)
  );
}

type PayProps = {
  pack: string;
  shipping: string | null;
  formRef: RefObject<HTMLFormElement | null>;
  validate?: CheckoutValidator | undefined;
  orderSummary?: ReactNode;
  onPaid?: ((paymentId: string | null) => void) | undefined;
  onProcessing?: (() => void) | undefined;
};

function PayForm({
  pack,
  shipping,
  formRef,
  validate,
  orderSummary,
  onPaid,
  onProcessing,
}: PayProps) {
  const payments = usePayments();
  const createPayment = useServerFn(createWhopPayment);
  const readStatus = useServerFn(getWhopPaymentStatus);

  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [elementError, setElementError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const track = (
    event: Parameters<typeof trackCheckout>[0],
    details: { errorCode?: string; errorMessage?: string } = {},
  ) => trackCheckout(event, { pack, shipping, ...details });

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => {
      setElementError(
        "The secure payment form could not be loaded. Check your connection or disable any blocker, then try again.",
      );
      track("payment_element_failed", { errorCode: "payment_element_load_timeout" });
    }, ELEMENT_READY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function finish(status: string | null, paymentId: string) {
    if (status === "succeeded") {
      onPaid?.(paymentId);
      return true;
    }
    if (status === "pending" || status === "requires_capture") {
      onProcessing?.();
      return true;
    }
    return false;
  }

  async function handlePay() {
    if (submittingRef.current) return;
    track("pay_clicked");

    if (!payments || !ready) {
      setError("The payment form is still loading. Please wait a moment and try again.");
      track("payment_element_failed", { errorCode: "whop_not_ready" });
      return;
    }

    setError(null);

    const validationError = validate?.();
    if (validationError) {
      setError(validationError);
      return;
    }

    const form = formRef.current;
    if (!form) {
      setError("We couldn't read your delivery details. Please refresh and try again.");
      track("form_validation_failed", { errorCode: "form_unavailable" });
      return;
    }

    if (!shipping) {
      setError("Please select a delivery method before paying.");
      track("form_validation_failed", { errorCode: "shipping_missing" });
      return;
    }

    if (!cardComplete) {
      setError("Please complete your card details.");
      track("form_validation_failed", { errorCode: "card_incomplete" });
      return;
    }

    track("form_validation_passed");

    const fd = new FormData(form);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const order = {
      email: v("email"),
      firstName: v("firstName"),
      lastName: v("lastName"),
      phone: v("phone"),
      street: v("street"),
      apartment: v("apartment"),
      city: v("city"),
      postalCode: v("postalCode"),
      country: "GB",
    };

    submittingRef.current = true;
    setSubmitting(true);

    const fail = (message: string, code: string, event: Parameters<typeof trackCheckout>[0] = "payment_failed") => {
      setError(message);
      track(event, { errorCode: code });
      submittingRef.current = false;
      setSubmitting(false);
    };

    try {
      /* Card data is tokenized inside Whop's isolated frames. */
      let token: string;
      try {
        const result = await payments.createConfirmationToken({
          billingDetails: {
            email: order.email,
            name: `${order.firstName} ${order.lastName}`.trim(),
            ...(order.phone ? { phone: order.phone } : {}),
            address: {
              country: "GB",
              line1: order.street,
              ...(order.apartment ? { line2: order.apartment } : {}),
              city: order.city,
              postal_code: order.postalCode.toUpperCase(),
            },
          },
        });
        token = result.confirmationToken;
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Please check your card details.";
        fail(message, "confirmation_token_failed", "elements_submit_failed");
        return;
      }

      track("elements_submit_succeeded");
      track("prepare_order_started");
      track("confirm_payment_started");

      const created = await withTimeout(
        createPayment({
          data: {
            pack,
            shipping: shipping as "standard" | "express",
            confirmationToken: token,
            checkoutSessionId: getCheckoutSessionId() ?? undefined,
            ...order,
            attribution: getAttribution(),
          },
        }),
        PAY_TIMEOUT_MS,
      );

      if (!created.ok) {
        fail(created.error, created.code ?? "whop_rejected", "prepare_order_failed");
        return;
      }

      track("prepare_order_succeeded");

      if (finish(created.status, created.paymentId)) return;

      /* 3DS / SCA or any other pending buyer step. */
      if (created.clientSecret) {
        track("payment_requires_action", { errorCode: "authentication_required" });

        const url = new URL(window.location.href);
        url.hash = "";
        url.searchParams.set(WHOP_RETURN_PARAM, created.paymentId);

        const next = await payments.handleNextAction({
          clientSecret: created.clientSecret,
          returnUrl: url.toString(),
        });

        if (next.redirected) return;

        /* Never trust the browser result: re-read on the server. */
        const confirmed = await readStatus({ data: { paymentId: created.paymentId } });
        const status = confirmed.ok ? confirmed.status : null;

        if (finish(status, created.paymentId)) return;

        fail(
          next.lastPaymentError?.message ??
            "The payment was not completed. Please try again or use another card.",
          next.lastPaymentError?.decline_code ??
            next.lastPaymentError?.code ??
            `payment_${status ?? "unknown"}`,
        );
        return;
      }

      fail(
        "The payment was declined. Please try another card.",
        `payment_${created.status}`,
      );
    } catch (err) {
      const timedOut = err instanceof Error && err.message === "timeout";
      fail(
        timedOut
          ? "The payment is taking longer than expected. Please tap Pay now to try again."
          : "We couldn't process your payment. Please try again.",
        timedOut ? "prepare_order_timeout" : "unexpected_error",
      );
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-co-border bg-co-bg p-3.5 md:border-0 md:p-0">
      <CardElement
        layout="stacked"
        onReady={() => {
          setReady(true);
          setElementError(null);
          track("payment_element_loaded");
        }}
        onChange={(e) => setCardComplete(e.complete)}
      />

      <div className="mt-3">
        <BrandingElement />
      </div>

      {elementError && (
        <div className="mt-3">
          <p className="text-sm text-red-600">{elementError}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-2 flex h-10 items-center gap-2 rounded-xl text-sm"
          >
            <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Try again
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {orderSummary && (
        <div className="mt-6 border-t border-co-border pt-6 lg:hidden">{orderSummary}</div>
      )}

      <Button
        type="button"
        onClick={handlePay}
        disabled={submitting}
        className="mt-5 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-co-cta px-6 text-base font-semibold text-co-bg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {submitting && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden="true" />}
        {submitting ? "Processing…" : "Pay now"}
      </Button>
    </div>
  );
}

/**
 * Whop Elements card form, mounted inline in our checkout.
 * Card number / expiry / CVC live in Whop's PCI-isolated frames.
 */
export function WhopPaymentElement({
  pack,
  shipping,
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
  onPaid?: (paymentId: string | null) => void;
  onProcessing?: () => void;
}) {
  const hydrated = useHydrated();
  const readConfig = useServerFn(getWhopConfig);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    readConfig()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setAccountId(r.accountId);
        else setError(r.error);
      })
      .catch(() => !cancelled && setError("We couldn't load the payment form."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elements = useMemo(() => (hydrated ? loadWhop() : null), [hydrated]);
  const amount = amountPence(pack, shipping ?? null);

  if (error) {
    return (
      <div className="py-4">
        <p role="alert" className="text-sm text-red-600">{error}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
          className="mt-3 flex h-10 items-center gap-2 rounded-xl text-sm"
        >
          <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden="true" />
          Try again
        </Button>
      </div>
    );
  }

  if (!elements || !accountId) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-co-muted">
        <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden="true" />
        Loading secure payment…
      </div>
    );
  }

  return (
    <div style={{ colorScheme: "light" }}>
      <WhopElements elements={elements}>
        <Payments accountId={accountId} currency="gbp" amount={amount}>
          <PayForm
            pack={pack}
            shipping={shipping ?? null}
            formRef={formRef}
            validate={validate}
            orderSummary={orderSummary}
            onPaid={onPaid}
            onProcessing={onProcessing}
          />
        </Payments>
      </WhopElements>
    </div>
  );
}
