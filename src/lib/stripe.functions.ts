import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  getBundle,
  getShippingMethod,
  parseAmount,
  STRIPE_PRODUCT_NAMES,
} from "./offer";

const STRIPE_API = "https://api.stripe.com/v1";
const CURRENCY = "gbp";

const PREPARE_ORDER_URL =
  "https://pqvkbiahjndyfkvoubxi.supabase.co/functions/v1/prepare-order";

const inputSchema = z.object({
  pack: z.string().min(1),
  email: z.string().email().optional(),
  shipping: z.string().min(1).nullish(),
});

export const createStripePaymentIntent = createServerFn({
  method: "POST",
})
  .inputValidator((data: unknown) =>
    inputSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const secretKey =
      process.env["STRIPE_SECRET_KEY"];

    const publishableKey =
      process.env["STRIPE_PUBLISHABLE_KEY"];

    if (!secretKey || !publishableKey) {
      return {
        ok: false as const,
        error:
          "Stripe is not configured yet. Please add the Stripe keys.",
      };
    }

    const bundle = getBundle(data.pack);

    const shipping =
      getShippingMethod(data.shipping);

    /*
     * Stripe receives only the final amount.
     */
    const amount =
      Math.round(
        parseAmount(bundle.price) * 100,
      ) +
      Math.round(
        (shipping?.amount ?? 0) * 100,
      );

    const form =
      new URLSearchParams();

    form.set(
      "amount",
      String(amount),
    );

    form.set(
      "currency",
      CURRENCY,
    );

    form.set(
      "payment_method_types[0]",
      "card",
    );

    /*
     * Keeping the current description for now.
     * This must be reviewed before launch.
     */
    form.set(
      "description",
      STRIPE_PRODUCT_NAMES[bundle.id] ??
        bundle.title,
    );

    if (data.email) {
      form.set(
        "receipt_email",
        data.email,
      );
    }

    try {
      const res =
        await fetch(
          `${STRIPE_API}/payment_intents`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${secretKey}`,

              "Content-Type":
                "application/x-www-form-urlencoded",

              "Idempotency-Key":
                crypto.randomUUID(),
            },

            body:
              form.toString(),
          },
        );

      const intent =
        (await res.json()) as {
          client_secret?: string;

          error?: {
            message?: string;
          };
        };

      if (
        !res.ok ||
        !intent.client_secret
      ) {
        console.error(
          "Stripe payment intent failed",
          res.status,
          intent,
        );

        return {
          ok: false as const,

          error:
            intent.error?.message ??
            "Could not start the payment.",
        };
      }

      return {
        ok: true as const,

        clientSecret:
          intent.client_secret,

        publishableKey,

        amount,
      };
    } catch (error) {
      console.error(error);

      return {
        ok: false as const,

        error:
          "Payment service unavailable. Please try again.",
      };
    }
  });

const updateIntentSchema =
  z.object({
    clientSecret:
      z.string().min(1),

    pack:
      z.string().min(1),

    shipping:
      z.string().min(1),

    email:
      z.string().email(),

    firstName:
      z.string().min(1),

    lastName:
      z.string().min(1),

    country:
      z.string().min(1),

    postalCode:
      z.string().min(1),

    street:
      z.string().min(1),

    apartment:
      z.string()
        .optional()
        .default(""),

    city:
      z.string().min(1),

    phone:
      z.string()
        .optional()
        .default(""),

    /*
     * Campaign attribution only.
     * Used to report the sale server-side.
     */
    attribution:
      z.record(
        z.enum(
          ATTRIBUTION_METADATA_KEYS,
        ),
        z.string().max(250),
      )
        .optional()
        .default({}),
  });

export const updateStripePaymentIntent =
  createServerFn({
    method: "POST",
  })
    .inputValidator(
      (data: unknown) =>
        updateIntentSchema.parse(
          data,
        ),
    )
    .handler(async ({ data }) => {
      const secretKey =
        process.env[
          "STRIPE_SECRET_KEY"
        ];

      const checkoutInternalSecret =
        process.env[
          "CHECKOUT_INTERNAL_SECRET"
        ];

      if (!secretKey) {
        return {
          ok: false as const,
          error:
            "Stripe is not configured.",
        };
      }

      /*
       * This secret exists only on our server.
       * Never send it to the browser.
       */
      if (!checkoutInternalSecret) {
        console.error(
          "CHECKOUT_INTERNAL_SECRET is not configured",
        );

        return {
          ok: false as const,
          error:
            "Checkout service is not configured.",
        };
      }

      /*
       * ------------------------------------------------
       * EXTRACT PAYMENT INTENT ID
       * ------------------------------------------------
       */
      const secretMarker =
        "_secret_";

      const secretPosition =
        data.clientSecret.indexOf(
          secretMarker,
        );

      if (
        secretPosition <= 0
      ) {
        return {
          ok: false as const,
          error:
            "Invalid PaymentIntent.",
        };
      }

      const paymentIntentId =
        data.clientSecret.slice(
          0,
          secretPosition,
        );

      if (
        !paymentIntentId ||
        !paymentIntentId.startsWith(
          "pi_",
        )
      ) {
        return {
          ok: false as const,
          error:
            "Invalid PaymentIntent.",
        };
      }

      /*
       * ------------------------------------------------
       * CALCULATE EXPECTED AMOUNT SERVER-SIDE
       * ------------------------------------------------
       *
       * Never trust a total sent by the browser.
       */
      let expectedAmount: number;

      try {
        const bundle =
          getBundle(data.pack);

        const shipping =
          getShippingMethod(
            data.shipping,
          );

        /*
         * updateStripePaymentIntent requires a
         * shipping method. If our offer helper
         * cannot resolve it, reject the request.
         */
        if (!shipping) {
          return {
            ok: false as const,
            error:
              "Invalid shipping method.",
          };
        }

        expectedAmount =
          Math.round(
            parseAmount(
              bundle.price,
            ) * 100,
          ) +
          Math.round(
            shipping.amount *
              100,
          );
      } catch (error) {
        console.error(
          "Could not calculate expected checkout amount",
          error,
        );

        return {
          ok: false as const,
          error:
            "Invalid checkout selection.",
        };
      }

      /*
       * ------------------------------------------------
       * VERIFY PAYMENT INTENT DIRECTLY WITH STRIPE
       * ------------------------------------------------
       *
       * We do NOT trust only the pi_ ID extracted from
       * browser input.
       *
       * Stripe must confirm:
       *
       * - PaymentIntent exists
       * - returned ID is the same
       * - complete client_secret is the same
       * - currency is GBP
       * - amount matches pack + shipping
       * - PaymentIntent is not already succeeded
       * - PaymentIntent is not canceled
       */
      try {
        const verifyResponse =
          await fetch(
            `${STRIPE_API}/payment_intents/${encodeURIComponent(
              paymentIntentId,
            )}`,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${secretKey}`,
              },
            },
          );

        const verifiedIntent =
          (await verifyResponse.json()) as {
            id?: string;

            client_secret?:
              string | null;

            amount?: number;

            currency?: string;

            status?: string;

            error?: {
              message?: string;
            };
          };

        if (!verifyResponse.ok) {
          console.error(
            "Stripe PaymentIntent verification failed",
            verifyResponse.status,
            verifiedIntent,
          );

          return {
            ok: false as const,

            error:
              "Could not verify the payment.",
          };
        }

        if (
          verifiedIntent.id !==
          paymentIntentId
        ) {
          console.error(
            "Stripe PaymentIntent ID mismatch",
          );

          return {
            ok: false as const,
            error:
              "Invalid PaymentIntent.",
          };
        }

        /*
         * Critical binding:
         *
         * The browser must possess the actual
         * client_secret belonging to this exact
         * PaymentIntent.
         */
        if (
          !verifiedIntent.client_secret ||
          verifiedIntent.client_secret !==
            data.clientSecret
        ) {
          console.error(
            "Stripe client secret mismatch",
            paymentIntentId,
          );

          return {
            ok: false as const,
            error:
              "Invalid PaymentIntent.",
          };
        }

        const stripeCurrency =
          String(
            verifiedIntent.currency ??
              "",
          ).toLowerCase();

        if (
          stripeCurrency !==
          CURRENCY
        ) {
          console.error(
            "Stripe currency mismatch",
            {
              paymentIntentId,
              stripeCurrency,
            },
          );

          return {
            ok: false as const,
            error:
              "Payment currency mismatch.",
          };
        }

        if (
          verifiedIntent.amount !==
          expectedAmount
        ) {
          console.error(
            "Stripe amount mismatch before prepare-order",
            {
              paymentIntentId,

              stripeAmount:
                verifiedIntent.amount,

              expectedAmount,
            },
          );

          return {
            ok: false as const,
            error:
              "Payment amount mismatch.",
          };
        }

        /*
         * prepare-order is for a payment that is still
         * being prepared.
         *
         * Never use this path to rewrite an already
         * successful or canceled PaymentIntent.
         */
        if (
          verifiedIntent.status ===
            "succeeded" ||
          verifiedIntent.status ===
            "canceled"
        ) {
          console.warn(
            "PaymentIntent can no longer be prepared",
            {
              paymentIntentId,
              status:
                verifiedIntent.status,
            },
          );

          return {
            ok: false as const,
            error:
              "Payment can no longer be modified.",
          };
        }
      } catch (error) {
        console.error(
          "Stripe verification unavailable",
          error,
        );

        return {
          ok: false as const,
          error:
            "Could not verify the payment.",
        };
      }

      /*
       * ------------------------------------------------
       * STORE PRIVATE DELIVERY DATA IN SUPABASE
       * ------------------------------------------------
       *
       * We reach this point only after Stripe itself
       * verified the PaymentIntent and its amount.
       */
      let checkoutOrderId:
        string;

      try {
        const prepareResponse =
          await fetch(
            PREPARE_ORDER_URL,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                /*
                 * Server-to-server authentication.
                 */
                "x-checkout-secret":
                  checkoutInternalSecret,
              },

              body:
                JSON.stringify({
                  paymentIntentId,

                  pack:
                    data.pack,

                  shipping:
                    data.shipping,

                  email:
                    data.email,

                  firstName:
                    data.firstName,

                  lastName:
                    data.lastName,

                  phone:
                    data.phone,

                  country:
                    data.country,

                  postalCode:
                    data.postalCode,

                  street:
                    data.street,

                  apartment:
                    data.apartment,

                  city:
                    data.city,
                }),
            },
          );

        const prepared =
          (await prepareResponse.json()) as {
            ok?: boolean;

            checkoutOrderId?:
              string;

            error?: string;
          };

        if (
          !prepareResponse.ok ||
          !prepared.ok ||
          !prepared.checkoutOrderId
        ) {
          console.error(
            "prepare-order failed",
            prepared,
          );

          return {
            ok: false as const,

            error:
              prepared.error ??
              "Could not prepare the order.",
          };
        }

        checkoutOrderId =
          prepared.checkoutOrderId;
      } catch (error) {
        console.error(
          "prepare-order unavailable",
          error,
        );

        return {
          ok: false as const,

          error:
            "Could not prepare the order.",
        };
      }

      /*
       * ------------------------------------------------
       * UPDATE STRIPE
       * ------------------------------------------------
       *
       * Stripe receives only:
       *
       * - receipt email
       * - our internal checkout_order_id
       *
       * Delivery address, phone, pack, shipping method
       * and shipping amount are NOT added as metadata.
       */
      const form =
        new URLSearchParams();

      form.set(
        "receipt_email",
        data.email,
      );

      form.set(
        "metadata[checkout_order_id]",
        checkoutOrderId,
      );

      try {
        const res =
          await fetch(
            `${STRIPE_API}/payment_intents/${encodeURIComponent(
              paymentIntentId,
            )}`,
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${secretKey}`,

                "Content-Type":
                  "application/x-www-form-urlencoded",
              },

              body:
                form.toString(),
            },
          );

        const intent =
          (await res.json()) as {
            id?: string;

            error?: {
              message?: string;
            };
          };

        if (!res.ok) {
          console.error(
            "Stripe PaymentIntent update failed",
            res.status,
            intent,
          );

          return {
            ok: false as const,

            error:
              intent.error?.message ??
              "Could not prepare the order.",
          };
        }

        if (
          intent.id !==
          paymentIntentId
        ) {
          console.error(
            "Unexpected PaymentIntent returned after update",
            {
              expected:
                paymentIntentId,

              received:
                intent.id,
            },
          );

          return {
            ok: false as const,
            error:
              "Could not prepare the order.",
          };
        }

        return {
          ok: true as const,

          checkoutOrderId,
        };
      } catch (error) {
        console.error(
          "Stripe PaymentIntent update unavailable",
          error,
        );

        return {
          ok: false as const,

          error:
            "Could not prepare the order.",
        };
      }
    });
