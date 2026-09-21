import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronDown,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  CircleHelp,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  tiktokIdentify,
  tiktokTrack,
} from "@/lib/tiktok";

import {
  ATTRIBUTION_KEYS,
  getAttribution,
} from "@/lib/attribution";
import { recordCheckoutInitiation } from "@/lib/ic.functions";
import { getStripePaymentIntentStatus } from "@/lib/stripe.functions";
import { useServerFn } from "@tanstack/react-start";

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
import { StripePaymentElement } from "@/components/checkout/StripePaymentElement";
import { AddressAutocomplete } from "@/components/checkout/AddressAutocomplete";
import { Button } from "@/components/ui/button";

import {
  Field,
  SelectField,
  CheckLine,
  SectionTitle,
} from "@/components/checkout/CheckoutFields";

/**
 * CHECKOUT
 *
 * Payment/order flow:
 *
 * Checkout
 *   -> Stripe
 *   -> signed Stripe webhook
 *   -> Supabase
 *   -> Shopify
 *
 * The browser does NOT create the Shopify order.
 * The Stripe webhook is the source of truth for paid orders.
 */
export const Route =
  createFileRoute("/checkout")({
    validateSearch: (
      search: Record<
        string,
        unknown
      >,
    ) => {
      const parsed: Record<
        string,
        string
      > = {
        pack:
          search["pack"] == null
            ? DEFAULT_BUNDLE_ID
            : String(
                search["pack"],
              ),
      };

      /*
       * Campaign parameters travel in the URL so
       * attribution survives private/in-app browsers
       * where sessionStorage is unavailable.
       */
      for (const key of ATTRIBUTION_KEYS) {
        const value = search[key];

        if (value != null) {
          parsed[key] = String(value);
        }
      }

      return parsed as {
        pack: string;
      } & Record<string, string>;
    },

    head: () => ({
      meta: [
        {
          title:
            "Checkout | Nutrion Life",
        },
        {
          name: "description",
          content:
            "Secure checkout for your Nutrion Life order. All transactions are encrypted.",
        },
        {
          property: "og:title",
          content:
            "Checkout | Nutrion Life",
        },
        {
          property:
            "og:description",
          content:
            "Complete your Nutrion Life order on our secure, encrypted checkout.",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          name: "twitter:card",
          content: "summary",
        },
        {
          name: "robots",
          content: "noindex",
        },
      ],
    }),

    component: CheckoutPage,
  });

const COUNTRIES = [
  "United Kingdom",
];

function CheckoutPage() {
  const { pack } =
    Route.useSearch();

  const bundle =
    getBundle(pack);

  const formRef =
    useRef<HTMLFormElement>(
      null,
    );

  const [
    status,
    setStatus,
  ] = useState<
    | "idle"
    | "loading"
    | "processing"
    | "done"
  >("idle");

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    postcode,
    setPostcode,
  ] = useState("");

  const [
    street,
    setStreet,
  ] = useState("");

  const [
    city,
    setCity,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const emailValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
      email.trim(),
    );

  const [
    shippingId,
    setShippingId,
  ] = useState<
    string | null
  >(null);

  const [
    summaryOpen,
    setSummaryOpen,
  ] = useState(false);

  const [
    paymentSummaryOpen,
    setPaymentSummaryOpen,
  ] = useState(false);

  const postcodeValid =
    isValidUkPostcode(
      postcode,
    );

  const shipping =
    (postcodeValid &&
      SHIPPING_METHODS.find(
        (method) =>
          method.id ===
          shippingId,
      )) ||
    null;

  /*
   * TikTok conversion data.
   */
  const orderTotal =
    parseAmount(
      bundle.price,
    ) +
    (shipping?.amount ??
      0);

  const compareTotal =
    parseAmount(
      bundle.compare,
    ) +
    (shipping?.amount ?? 0);

  const tiktokContents = [
    {
      content_id:
        bundle.id,

      content_name:
        bundle.productName ??
        bundle.title,

      content_type:
        "product" as const,

      quantity:
        bundle.quantity ??
        1,

      price:
        parseAmount(
          bundle.price,
        ),
    },
  ];

  /*
   * Fires once per checkout visit.
   */
  const initiatedRef =
    useRef(false);

  useEffect(() => {
    if (
      initiatedRef.current
    ) {
      return;
    }

    initiatedRef.current =
      true;

    tiktokTrack(
      "InitiateCheckout",
      {
        value:
          parseAmount(
            bundle.price,
          ),

        contents:
          tiktokContents,
      },
    );

    /*
     * Server-side IC record with the
     * campaign attribution. Fire-and-forget:
     * it must never block the checkout.
     */
    void recordCheckoutInitiation({
      data: {
        pack: bundle.id,
        attribution: getAttribution(),
      },
    }).catch(() => {});

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack]);

  /*
   * Buyer identity improves
   * TikTok attribution matching.
   */
  useEffect(() => {
    if (emailValid) {
      tiktokIdentify(
        email,
      );
    }
  }, [
    email,
    emailValid,
  ]);

  /**
   * Called by StripePaymentElement
   * after Stripe confirms that the
   * payment succeeded.
   *
   * IMPORTANT:
   *
   * We do NOT create the Shopify
   * order here.
   *
   * Stripe's signed webhook handles
   * the actual paid-order workflow.
   */
  const paidRef = useRef(false);

  const handlePaid =
    useCallback(
      async () => {
        /*
         * CompletePayment must fire exactly once,
         * even if Stripe reports success twice
         * (e.g. after a 3-D Secure return).
         */
        if (paidRef.current) {
          setStatus("done");
          return;
        }

        paidRef.current = true;

        const form =
          formRef.current;

        const data =
          form
            ? new FormData(form)
            : null;

        const value = (
          key: string,
        ) =>
          String(
            data?.get(key) ??
              "",
          ).trim();

        setStatus(
          "loading",
        );

        setError(null);

        /*
         * Client-side analytics only.
         *
         * This does NOT create,
         * register or fulfill an order.
         */
        try {
          tiktokIdentify(
            value("email"),
            value("phone"),
          );

          tiktokTrack(
            "CompletePayment",
            {
              value:
                orderTotal,

              contents:
                tiktokContents,
            },
          );
        } catch (
          trackingError
        ) {
          /*
           * Analytics must never turn
           * a successful payment into
           * an error for the customer.
           */
          console.error(
            "TikTok tracking failed",
            trackingError,
          );
        }

        /*
         * The signed Stripe webhook is
         * responsible for:
         *
         * - validating the payment
         * - marking the Supabase order paid
         * - creating the Shopify order
         * - protecting against duplicates
         *
         * The checkout only shows the
         * payment success state.
         */
        setStatus("done");
      },
      [
        orderTotal,
        tiktokContents,
      ],
    );

  /**
   * A payment that is still `processing` is NOT
   * approved: no conversion event is fired here.
   */
  const handleProcessing =
    useCallback(() => {
      setError(null);
      setStatus("processing");
    }, []);

  /*
   * ----------------------------------------------
   * FIELD-LEVEL VALIDATION
   * ----------------------------------------------
   *
   * Returns the message for the first invalid field
   * and focuses/scrolls to it, so tapping Pay never
   * looks like nothing happened.
   */
  function markInvalid(
    element: HTMLElement | null,
  ) {
    if (!element) return;

    element.setAttribute(
      "aria-invalid",
      "true",
    );

    element.classList.add(
      "border-red-500",
      "ring-1",
      "ring-red-500",
    );

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    if (
      element instanceof
        HTMLInputElement ||
      element instanceof
        HTMLSelectElement
    ) {
      element.focus({
        preventScroll: true,
      });
    }
  }

  function clearInvalidMarks(
    form: HTMLFormElement,
  ) {
    form
      .querySelectorAll(
        "[aria-invalid='true']",
      )
      .forEach((node) => {
        node.removeAttribute(
          "aria-invalid",
        );

        node.classList.remove(
          "border-red-500",
          "ring-1",
          "ring-red-500",
        );
      });
  }

  const validateCheckout =
    useCallback((): string | null => {
      const form = formRef.current;

      if (!form) {
        return "We couldn't read your details. Please refresh the page and try again.";
      }

      clearInvalidMarks(form);

      const field = (
        name: string,
      ) =>
        form.elements.namedItem(
          name,
        ) as
          | HTMLInputElement
          | HTMLSelectElement
          | null;

      const checks: {
        name: string;
        message: string;
        invalidMessage?: string;
        isValid?: (
          value: string,
        ) => boolean;
      }[] = [
        {
          name: "email",
          message:
            "Please enter your email address.",
          invalidMessage:
            "This email address looks incorrect. Please check it and try again.",
          isValid: (value) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
              value,
            ),
        },
        {
          name: "firstName",
          message:
            "Please enter your first name.",
        },
        {
          name: "lastName",
          message:
            "Please enter your last name.",
        },
        {
          name: "street",
          message:
            "Please enter your delivery address.",
        },
        {
          name: "city",
          message:
            "Please enter your city.",
        },
        {
          name: "postalCode",
          message:
            "Please enter your postcode.",
          invalidMessage:
            "Please enter a valid UK postcode, for example SW1A 1AA.",
          isValid: (value) =>
            isValidUkPostcode(value),
        },
      ];

      for (const check of checks) {
        const element = field(
          check.name,
        );

        const raw =
          element?.value?.trim() ??
          "";

        if (!raw) {
          markInvalid(element);
          return check.message;
        }

        if (
          check.isValid &&
          !check.isValid(raw)
        ) {
          markInvalid(element);

          return (
            check.invalidMessage ??
            check.message
          );
        }
      }

      if (!shipping) {
        const firstShipping =
          form.querySelector(
            "input[name='shippingMethod']",
          ) as HTMLInputElement | null;

        if (firstShipping) {
          markInvalid(firstShipping);
        }

        return "Please choose a delivery method.";
      }

      return null;
    }, [shipping]);

  /*
   * ----------------------------------------------
   * 3-D SECURE RETURN
   * ----------------------------------------------
   *
   * Banks that authenticate through a redirect send
   * the buyer back here with the client secret in the
   * URL. Only Stripe can confirm the real status.
   */
  const readIntentStatus =
    useServerFn(
      getStripePaymentIntentStatus,
    );

  const returnHandledRef =
    useRef(false);

  useEffect(() => {
    if (returnHandledRef.current) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const returnedSecret =
      params.get(
        "payment_intent_client_secret",
      );

    if (!returnedSecret) {
      return;
    }

    returnHandledRef.current = true;
    setStatus("loading");

    void (async () => {
      try {
        const result =
          await readIntentStatus({
            data: {
              clientSecret:
                returnedSecret,
            },
          });

        if (
          result.ok &&
          result.status === "succeeded"
        ) {
          await handlePaid();
          return;
        }

        if (
          result.ok &&
          result.status === "processing"
        ) {
          handleProcessing();
          return;
        }

        setStatus("idle");

        setError(
          result.ok
            ? "The authentication was not completed, so the payment did not go through. Please try again."
            : result.error,
        );
      } catch (err) {
        console.error(err);

        setStatus("idle");

        setError(
          "We couldn't confirm your payment status. Please try again.",
        );
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
  }

  return (
    <div className="min-h-screen bg-co-bg text-co-fg">
      {/* Header */}
      <header className="border-b border-co-border bg-white">
        <div className="relative mx-auto flex h-[100px] max-w-[1200px] items-center justify-center px-[14px] lg:h-[72px] lg:px-10">
          <Link
            to="/"
            aria-label="Nutrion Life — back to store"
          >
            <img
              src={
                logoAsset.url
              }
              alt="Nutrion Life"
              className="h-auto w-[130px] lg:h-10 lg:w-auto"
              width={4435}
              height={1826}
            />
          </Link>

          <Link
            to="/"
            aria-label="Back to store"
            className="absolute right-[14px] top-1/2 -translate-y-1/2 text-ink hover:opacity-80 lg:right-10"
          >
            <ShoppingBag
              className="size-6"
              strokeWidth={
                1.75
              }
              aria-hidden="true"
            />
          </Link>
        </div>
      </header>

      <section className="border-b border-co-border bg-co-surface lg:hidden">
        <Button
          type="button"
          variant="ghost"
          aria-expanded={summaryOpen}
          aria-controls="mobile-order-summary"
          onClick={() => setSummaryOpen((open) => !open)}
          className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between rounded-none px-[14px] text-co-fg hover:bg-co-surface"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            Order summary
            <ChevronDown
              className={`size-4 transition-transform ${summaryOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </span>
          <span className="flex items-baseline gap-2">
            {compareTotal > orderTotal ? (
              <span className="text-xs font-normal text-co-muted line-through">
                {formatAmount(compareTotal)}
              </span>
            ) : null}
            <span className="text-base font-semibold">{formatAmount(orderTotal)}</span>
          </span>
        </Button>
        <div
          id="mobile-order-summary"
          hidden={!summaryOpen}
          className="border-t border-co-border px-[14px] py-5"
        >
          <CheckoutSummary bundle={bundle} shipping={shipping} />
        </div>
      </section>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-[14px] py-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16 lg:px-10 lg:py-12">
        {/* LEFT: form */}
        <main className="min-w-0">
          <h1 className="sr-only">
            Checkout
          </h1>

          <form
            ref={formRef}
            onSubmit={
              handleSubmit
            }
          >
            {/* Contact */}
            <section>
              <div className="mb-3">
                <SectionTitle>
                  Contact
                </SectionTitle>
              </div>

              <Field
                label="Email"
                type="email"
                name="email"
                required
                autoComplete="email"
                onChange={
                  setEmail
                }
              />

              <div className="mt-3">
                <CheckLine>
                  Email me with
                  news and offers
                </CheckLine>
              </div>
            </section>

            {/* Delivery */}
            <section className="mt-9">
              <SectionTitle>
                Delivery
              </SectionTitle>

              <div className="space-y-3">
                <SelectField
                  label="Country/Region"
                  name="country"
                  options={
                    COUNTRIES
                  }
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field
                    label="First name"
                    name="firstName"
                    required
                    autoComplete="given-name"
                  />

                  <Field
                    label="Last name"
                    name="lastName"
                    required
                    autoComplete="family-name"
                  />
                </div>

                <AddressAutocomplete
                  label="Address"
                  name="street"
                  required
                  value={
                    street
                  }
                  onValueChange={
                    setStreet
                  }
                  onSelect={(
                    selected,
                  ) => {
                    setStreet(
                      selected.street ||
                        selected.label,
                    );

                    if (
                      selected.city
                    ) {
                      setCity(
                        selected.city,
                      );
                    }

                    if (
                      selected.postcode
                    ) {
                      setPostcode(
                        selected.postcode,
                      );
                    }
                  }}
                />

                <Field
                  label="Apartment, suite, etc. (optional)"
                  name="apartment"
                  autoComplete="address-line2"
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field
                    label="City"
                    name="city"
                    required
                    autoComplete="address-level2"
                    value={
                      city
                    }
                    onChange={
                      setCity
                    }
                  />

                  <Field
                    label="Postcode"
                    name="postalCode"
                    required
                    autoComplete="postal-code"
                    value={
                      postcode
                    }
                    onChange={
                      setPostcode
                    }
                  />
                </div>

                <Field
                  label="Phone (optional)"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  icon={
                    <CircleHelp
                      className="size-4"
                      strokeWidth={
                        1.75
                      }
                      aria-hidden="true"
                    />
                  }
                />

                <div className="hidden md:block">
                  <CheckLine>
                    Save this information for next time
                  </CheckLine>
                </div>
              </div>
            </section>

            {/* Shipping method */}
            <section className="mt-9">
              <h2 className="mb-3 text-base font-bold text-co-fg">Shipping method</h2>

              {postcodeValid ? (
                <div
                  role="radiogroup"
                  aria-label="Shipping method"
                  className="divide-y divide-co-border overflow-hidden rounded-lg border border-co-border bg-co-surface"
                >
                  {SHIPPING_METHODS.map(
                    (
                      method,
                    ) => {
                      const selected =
                        shippingId ===
                        method.id;

                      return (
                        <label
                          key={
                            method.id
                          }
                          className={`flex min-h-12 cursor-pointer items-center gap-3 px-3.5 py-3 text-sm transition-colors ${
                            selected
                              ? "bg-co-surface"
                              : "hover:bg-co-surface/60"
                          }`}
                        >
                          <input
                            type="radio"
                            name="shippingMethod"
                            value={
                              method.id
                            }
                            required
                            checked={
                              selected
                            }
                            onChange={() =>
                              setShippingId(
                                method.id,
                              )
                            }
                            className="size-4 accent-[var(--co-accent)]"
                          />

                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-co-fg">
                              {
                                method.label
                              }
                            </span>

                            <span className="block text-xs text-co-muted">
                              {
                                method.description
                              }
                            </span>
                          </span>

                          <span className="shrink-0 text-sm font-medium text-co-fg">
                            {method.amount ===
                            0
                              ? "Free"
                              : formatAmount(
                                  method.amount,
                                )}
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-co-border bg-co-surface px-3.5 py-4 text-sm text-co-muted">
                  Enter your
                  shipping address
                  to view available
                  shipping methods.
                </div>
              )}
            </section>

            {/* Payment */}
            <section className="mt-9">
              <SectionTitle>
                Payment
              </SectionTitle>

              <p className="mb-3 text-sm text-co-muted">
                All
                transactions are
                secure and
                encrypted.
              </p>

              {status ===
              "done" ? (
                <div className="rounded-md border border-co-border bg-co-surface p-5">
                  <p className="flex items-center gap-2 text-sm font-medium text-co-fg">
                    <CheckCircle2
                      className="size-5 text-co-accent"
                      strokeWidth={
                        1.75
                      }
                      aria-hidden="true"
                    />

                    Payment
                    approved
                  </p>

                  <p className="mt-2 text-sm text-co-muted">
                    Your order is
                    being
                    processed.
                    You'll
                    receive your
                    confirmation
                    and shipping
                    updates by
                    email.
                  </p>
                </div>
              ) : (
                <>
                  <StripePaymentElement
                    pack={pack}
                    shipping={
                      shipping?.id ??
                      null
                    }
                    postcode={
                      postcodeValid
                        ? postcode
                            .trim()
                            .toUpperCase()
                        : null
                    }
                    email={
                      emailValid
                        ? email.trim()
                        : null
                    }
                    orderSummary={
                      <section aria-labelledby="payment-order-summary-title">
                        <Button
                          type="button"
                          variant="ghost"
                          aria-expanded={paymentSummaryOpen}
                          aria-controls="payment-order-summary-details"
                          onClick={() =>
                            setPaymentSummaryOpen((open) => !open)
                          }
                          className="flex h-auto w-full items-center gap-3 rounded-none p-0 text-co-fg hover:bg-transparent"
                        >
                          <span className="size-10 shrink-0 overflow-hidden rounded-lg border border-co-border bg-co-surface">
                            <img
                              src={bundle.image}
                              alt=""
                              className="size-full object-contain"
                            />
                          </span>
                          <span className="min-w-0 flex-1 text-left">
                            <span
                              id="payment-order-summary-title"
                              className="block text-base font-semibold"
                            >
                              Total
                            </span>
                            <span className="block text-xs font-normal text-co-muted">
                              {bundle.quantity ?? 1} item{(bundle.quantity ?? 1) > 1 ? "s" : ""}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="text-[11px] font-normal text-co-muted">
                              GBP
                            </span>
                            <span className="text-xl font-semibold">
                              {formatAmount(orderTotal)}
                            </span>
                            <ChevronDown
                              className={`size-4 transition-transform ${paymentSummaryOpen ? "rotate-180" : ""}`}
                              aria-hidden="true"
                            />
                          </span>
                        </Button>
                        <div
                          id="payment-order-summary-details"
                          hidden={!paymentSummaryOpen}
                          className="mt-5 border-t border-co-border pt-5"
                        >
                          <CheckoutSummary
                            bundle={bundle}
                            shipping={shipping}
                          />
                        </div>
                      </section>
                    }
                    onPaid={
                      handlePaid
                    }
                  />

                  {status ===
                    "loading" && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-co-muted">
                      <Loader2
                        className="size-4 animate-spin"
                        strokeWidth={
                          2
                        }
                        aria-hidden="true"
                      />

                      Confirming
                      your
                      payment…
                    </p>
                  )}

                  {error && (
                    <p className="mt-3 text-sm text-red-600">
                      {error}
                    </p>
                  )}

                  <p className="mt-4 flex items-center justify-center gap-2 text-xs text-co-muted">
                    <ShieldCheck
                      className="size-4"
                      strokeWidth={
                        1.75
                      }
                      aria-hidden="true"
                    />

                    Secure and
                    encrypted
                    payment
                  </p>
                </>
              )}
            </section>
          </form>

        </main>

        {/* RIGHT: order summary */}
        <aside className="hidden min-w-0 lg:block lg:border-l lg:border-co-border lg:pl-16">
          <div className="lg:sticky lg:top-10">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-co-muted">
              <Lock
                className="size-4"
                strokeWidth={
                  1.75
                }
                aria-hidden="true"
              />

              Order summary
            </h2>

            <CheckoutSummary
              bundle={
                bundle
              }
              shipping={
                shipping
              }
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
