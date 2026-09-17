import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getBundle, getShippingMethod, parseAmount, PRODUCT_NAME } from "./offer";

const inputSchema = z.object({
  pack: z.string().min(1),
  email: z.string().email().optional(),
  origin: z.string().url().optional(),
  /** Shipping method id selected by the buyer (see SHIPPING_METHODS). */
  shipping: z.string().min(1).nullish(),
});

const COOUD_API = "https://api.cooud.com/v2";
const COMPAT_DATE = "2026-09-01";
/**
 * The Cooud store currency must match the line items. Accounts differ, so we
 * try the likely currencies in order and keep the first one the store accepts.
 */
const CURRENCY_CANDIDATES = ["gbp", "eur", "usd"] as const;


/**
 * Creates a Cooud API v2 Checkout Session in `ui_mode: "custom"` and returns
 * ONLY the opaque Cooud Element tokens, so the payment component can be mounted
 * inline on our own checkout page (no redirect, no PSP keys in the browser).
 */
export const createCooudPaymentSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const secretKey = process.env["COOUD_SECRET_KEY"];
    if (!secretKey) {
      return { ok: false as const, error: "COOUD_SECRET_KEY is not configured" };
    }

    const bundle = getBundle(data.pack);
    // Selected delivery option — charged on top of the product price so the
    // Cooud transaction total matches the order summary shown to the buyer.
    const shipping = getShippingMethod(data.shipping);
    // Cooud only accepts https origins (local dev falls back to the live site).
    const origin =
      data.origin && data.origin.startsWith("https://")
        ? data.origin.replace(/\/$/, "")
        : "https://nutriigeeks.lovable.app";

    const headers = {
      Authorization: `Bearer ${secretKey}`,
      "Cooud-Compat-Date": COMPAT_DATE,
      "Content-Type": "application/json",
    } satisfies Record<string, string>;

    const makeBody = (currency: string): Record<string, unknown> => {
      const lineItems: Record<string, unknown>[] = [
        {
          name: `${bundle.productName ?? PRODUCT_NAME} — ${bundle.variant ?? bundle.title}`,
          amount: Math.round(parseAmount(bundle.price) * 100),
          currency,
          quantity: 1,
        },
      ];
      if (shipping && shipping.amount > 0) {
        lineItems.push({
          name: `${shipping.label} (${shipping.description})`,
          amount: Math.round(shipping.amount * 100),
          currency,
          quantity: 1,
        });
      }
      const totalAmount = lineItems.reduce(
        (sum, item) => sum + Number(item["amount"]) * Number(item["quantity"]),
        0,
      );
      const body: Record<string, unknown> = {
        ui_mode: "custom",
        line_items: lineItems,
        // Cooud requires presentment_currency and presentment_amount together.
        presentment_currency: currency,
        presentment_amount: totalAmount,
        // Country/Territory + Postal code + en-GB labels are handled by the
        // Cooud Elements payment component itself (see CooudPaymentElement).


        success_url: `${origin}/checkout?pack=${bundle.id}&paid=1`,
        cancel_url: `${origin}/checkout?pack=${bundle.id}`,
        allowed_origins: [origin],
        metadata: {
          pack: bundle.id,
          variant: bundle.variant ?? bundle.title,
          shipping: shipping?.id ?? "none",
          shipping_amount: String(shipping?.amount ?? 0),
        },
      };
      if (data.email) body["customer_email"] = data.email;
      return body;
    };

    try {
      let session: { id?: string; error?: { message?: string; code?: string } } = {};
      let lastStatus = 0;
      for (const currency of CURRENCY_CANDIDATES) {
        const sessionRes = await fetch(`${COOUD_API}/checkout-sessions`, {
          method: "POST",
          headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify(makeBody(currency)),
        });
        lastStatus = sessionRes.status;
        session = (await sessionRes.json()) as typeof session;
        if (sessionRes.ok && session.id) break;
        const message = session.error?.message ?? "";
        // Only a currency mismatch is worth retrying with the next candidate.
        if (!/currency/i.test(message)) break;
      }
      if (!session.id) {
        console.error("Cooud session create failed", lastStatus, session);
        return {
          ok: false as const,
          error: session.error?.message ?? "Could not start the payment session.",
        };
      }


      // Cooud controls the Element theme server-side via element-config.
      // Request the light theme so the embedded card form matches our white
      // checkout (instead of the store's dark default).
      const configRes = await fetch(
        `${COOUD_API}/checkout-sessions/${session.id}/element-config`,
        { method: "POST", headers, body: JSON.stringify({ theme: "light" }) },
      );
      const config = (await configRes.json()) as {
        cooud_element_token?: string;
        cooud_session_secret?: string;
        element?: { appearance?: unknown };
        error?: { message?: string };
      };
      if (!configRes.ok || !config.cooud_element_token || !config.cooud_session_secret) {
        console.error("Cooud element-config failed", configRes.status, config);
        return {
          ok: false as const,
          error: config.error?.message ?? "Could not load the payment component.",
        };
      }

      return {
        ok: true as const,
        sessionId: session.id,
        elementToken: config.cooud_element_token,
        sessionSecret: config.cooud_session_secret,
        appearance: config.element?.appearance ?? null,
      };
    } catch (error) {
      console.error(error);
      return { ok: false as const, error: "Payment service unavailable. Please try again." };
    }
  });
