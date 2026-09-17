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
  .inputValidator((data: unknown) => inputSchema.parse(data))
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
     * Stripe receives ONLY the final amount.
     *
     * Example:
     * £44.99 product + £6.91 delivery
     * Stripe receives amount = 5190.
     *
     * We do NOT tell Stripe which portion
     * represents shipping.
     */
    const amount =
      Math.round(
        parseAmount(bundle.price) * 100,
      ) +
      Math.round(
        (shipping?.amount ?? 0) * 100,
      );

    const form = new URLSearchParams();

    form.set("amount", String(amount));
    form.set("currency", CURRENCY);

    form.set(
      "payment_method_types[0]",
      "card",
    );

    /*
     * We are intentionally leaving the
     * current Stripe description unchanged
     * for now. We'll review it at the end.
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

    /*
     * IMPORTANT:
     *
     * No pack.
     * No shipping.
     * No shipping_amount.
     * No address.
     * No phone.
     * No customer name.
     *
     * The checkout order reference will only
     * be attached later, immediately before
     * payment confirmation.
     */

    try {
      const res = await fetch(
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

          body: form.toString(),
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

const updateIntentSchema = z.object({
  clientSecret: z.string().min(1),

  pack: z.string().min(1),
  shipping: z.string().min(1),

  email: z.string().email(),

  firstName: z.string().min(1),
  lastName: z.string().min(1),

  country: z.string().min(1),
  postalCode: z.string().min(1),
  street: z.string().min(1),

  apartment:
    z.string().optional().default(""),

  city: z.string().min(1),

  phone:
    z.string().optional().default(""),
});

export const updateStripePaymentIntent =
  createServerFn({
    method: "POST",
  })
    .inputValidator((data: unknown) =>
      updateIntentSchema.parse(data),
    )
    .handler(async ({ data }) => {
      const secretKey =
        process.env["STRIPE_SECRET_KEY"];

      if (!secretKey) {
        return {
          ok: false as const,
          error:
            "Stripe is not configured.",
        };
      }

      const paymentIntentId =
        data.clientSecret.split(
          "_secret_",
        )[0];

      if (
        !paymentIntentId ||
        !paymentIntentId.startsWith("pi_")
      ) {
        return {
          ok: false as const,
          error:
            "Invalid PaymentIntent.",
        };
      }

      /*
       * ------------------------------------------------
       * STEP 1
       * Store delivery/customer information in Supabase.
       * ------------------------------------------------
       *
       * Stripe never receives these fields.
       */
      let checkoutOrderId: string;

      try {
        const prepareResponse =
          await fetch(
            PREPARE_ORDER_URL,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                pack: data.pack,
                shipping:
                  data.shipping,

                email: data.email,

                firstName:
                  data.firstName,

                lastName:
                  data.lastName,

                phone: data.phone,

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

            checkoutOrderId?: string;

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
       * STEP 2
       * Attach ONLY the internal order ID to Stripe.
       * ------------------------------------------------
       *
       * This is the only metadata required by
       * our webhook.
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
        const res = await fetch(
          `${STRIPE_API}/payment_intents/${paymentIntentId}`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${secretKey}`,

              "Content-Type":
                "application/x-www-form-urlencoded",
            },

            body: form.toString(),
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

        return {
          ok: true as const,

          checkoutOrderId,
        };
      } catch (error) {
        console.error(error);

        return {
          ok: false as const,

          error:
            "Could not prepare the order.",
        };
      }
    });
