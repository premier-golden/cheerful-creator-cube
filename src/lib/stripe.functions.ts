import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getBundle, getShippingMethod, parseAmount, STRIPE_PRODUCT_NAMES } from "./offer";

const inputSchema = z.object({
  pack: z.string().min(1),
  email: z.string().email().optional(),
  shipping: z.string().min(1).nullish(),

  firstName: z.string().optional(),
  lastName: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  street: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

const STRIPE_API = "https://api.stripe.com/v1";
const CURRENCY = "gbp";

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

    const amount = Math.round(parseAmount(bundle.price) * 100) + Math.round((shipping?.amount ?? 0) * 100);

    const form = new URLSearchParams();

    form.set("amount", String(amount));
    form.set("currency", CURRENCY);
    form.set("payment_method_types[0]", "card");

    form.set("description", STRIPE_PRODUCT_NAMES[bundle.id] ?? bundle.title);

    if (data.email) {
      form.set("receipt_email", data.email);
    }

    // Order identification
    form.set("metadata[pack]", bundle.id);
    form.set("metadata[variant]", bundle.variant ?? bundle.title);

    // Shipping selection
    form.set("metadata[shipping]", shipping?.id ?? "none");
    form.set("metadata[shipping_amount]", String(shipping?.amount ?? 0));

    // Customer
    form.set("metadata[first_name]", data.firstName ?? "");
    form.set("metadata[last_name]", data.lastName ?? "");
    form.set("metadata[email]", data.email ?? "");
    form.set("metadata[phone]", data.phone ?? "");

    // Delivery address
    form.set("metadata[country]", data.country ?? "United Kingdom");
    form.set("metadata[postal_code]", data.postalCode ?? "");
    form.set("metadata[street]", data.street ?? "");
    form.set("metadata[apartment]", data.apartment ?? "");
    form.set("metadata[city]", data.city ?? "");

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

      return {
        ok: false as const,
        error: "Payment service unavailable. Please try again.",
      };
    }
  });
