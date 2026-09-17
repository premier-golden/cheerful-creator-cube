import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getBundle, getShippingMethod, parseAmount, PRODUCT_NAME } from "./offer";

const inputSchema = z.object({
  pack: z.string().min(1),
  email: z.string().email().optional(),
  /** Shipping method id selected by the buyer (see SHIPPING_METHODS). */
  shipping: z.string().min(1).nullish(),
});

const STRIPE_API = "https://api.stripe.com/v1";
const CURRENCY = "gbp";

/**
 * Creates a Stripe PaymentIntent for the selected pack + delivery option and
 * returns the client secret plus the publishable key, so the Stripe Payment
 * Element can be mounted inline on our own checkout page (no redirect).
 */
export const createStripePaymentIntent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const secretKey = process.env["STRIPE_SECRET_KEY"];
    const publishableKey = process.env["STRIPE_PUBLISHABLE_KEY"];
    if (!secretKey || !publishableKey) {
      return {
        ok: false as const,
        error: "Stripe is not configured yet. Please add the Stripe keys.",
      };
    }

    const bundle = getBundle(data.pack);
    const shipping = getShippingMethod(data.shipping);
    const amount =
      Math.round(parseAmount(bundle.price) * 100) + Math.round((shipping?.amount ?? 0) * 100);

    const form = new URLSearchParams();
    form.set("amount", String(amount));
    form.set("currency", CURRENCY);
    form.set("automatic_payment_methods[enabled]", "true");
    form.set(
      "description",
      `${bundle.productName ?? PRODUCT_NAME} — ${bundle.variant ?? bundle.title}`,
    );
    if (data.email) form.set("receipt_email", data.email);
    form.set("metadata[pack]", bundle.id);
    form.set("metadata[variant]", bundle.variant ?? bundle.title);
    form.set("metadata[shipping]", shipping?.id ?? "none");
    form.set("metadata[shipping_amount]", String(shipping?.amount ?? 0));

    try {
      const res = await fetch(`${STRIPE_API}/payment_intents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: form.toString(),
      });
      const intent = (await res.json()) as {
        client_secret?: string;
        error?: { message?: string };
      };
      if (!res.ok || !intent.client_secret) {
        console.error("Stripe payment intent failed", res.status, intent);
        return {
          ok: false as const,
          error: intent.error?.message ?? "Could not start the payment.",
        };
      }
      return {
        ok: true as const,
        clientSecret: intent.client_secret,
        publishableKey,
        amount,
      };
    } catch (error) {
      console.error(error);
      return { ok: false as const, error: "Payment service unavailable. Please try again." };
    }
  });
