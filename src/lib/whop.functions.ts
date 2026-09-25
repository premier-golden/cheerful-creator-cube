import { createServerFn } from "@tanstack/react-start";
import {
  getCookie,
  getRequestHeader,
  getRequestIP,
} from "@tanstack/react-start/server";
import { z } from "zod";

import {
  BUNDLES,
  getShippingMethod,
  parseAmount,
  STRIPE_PRODUCT_NAMES,
} from "./offer";

/**
 * Whop payments (replaces Stripe in the checkout).
 *
 * The browser sends only identifiers (pack, shipping) plus
 * the Whop confirmation token. The server resolves the
 * price from the central offer table, creates an inline
 * one-time plan and charges it. WHOP_API_KEY never leaves
 * this module's handlers.
 *
 * Docs: https://docs.whop.com/api-reference/payments/create-payment
 */
const WHOP_API = "https://api.whop.com/api/v1";
const REQUEST_TIMEOUT_MS = 20000;

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "src",
  "sck",
  "fbclid",
  "ttclid",
  "gclid",
] as const;

/** Server-trusted total in pence for a pack + shipping pair. */
function resolveTotal(pack: string, shippingId: string) {
  const bundle = BUNDLES.find((b) => b.id === pack);
  const shipping = getShippingMethod(shippingId);

  if (!bundle || !shipping) return null;

  const pence =
    Math.round(parseAmount(bundle.price) * 100) +
    Math.round(shipping.amount * 100);

  return { bundle, shipping, pence };
}

/** Frontend gating hint only; the charge is recomputed server-side. */
export function publicAmountPence(pack: string, shippingId: string | null) {
  const bundle = BUNDLES.find((b) => b.id === pack) ?? BUNDLES[0]!;
  const shipping = getShippingMethod(shippingId);

  return (
    Math.round(parseAmount(bundle.price) * 100) +
    Math.round((shipping?.amount ?? 0) * 100)
  );
}

export const getWhopConfig = createServerFn({ method: "GET" }).handler(
  async () => {
    /* Whop Elements expects the biz_ account id in the browser. */
    const accountId = process.env["WHOP_COMPANY_ID"];

    return accountId
      ? { ok: true as const, accountId }
      : { ok: false as const, error: "Payments are not configured." };
  },
);

const paymentSchema = z.object({
  pack: z.enum(["1", "3", "6"]),
  shipping: z.enum(["standard", "express"]),
  confirmationToken: z.string().regex(/^ctok_[A-Za-z0-9_]+$/).max(200),
  checkoutSessionId: z.string().uuid().optional(),
  email: z.string().email().max(200),
  firstName: z.string().max(100).default(""),
  lastName: z.string().max(100).default(""),
  phone: z.string().max(40).default(""),
  street: z.string().max(200).default(""),
  apartment: z.string().max(200).default(""),
  city: z.string().max(100).default(""),
  postalCode: z.string().max(20).default(""),
  country: z.string().max(60).default("GB"),
  attribution: z
    .record(z.string(), z.string().max(250))
    .optional()
    .default({}),
});

type WhopPayment = {
  id?: string;
  status?: string | null;
  substatus?: string | null;
  client_secret?: string | null;
};

export type WhopPaymentResult =
  | {
      ok: true;
      paymentId: string;
      /** Friendly status: succeeded | pending | failed | ... */
      status: string;
      clientSecret: string | null;
    }
  | { ok: false; error: string; code?: string };

function friendlyError(status: number): string {
  if (status === 401) return "Payments are misconfigured (authentication).";
  if (status === 403) return "Payments are misconfigured (permission).";
  if (status === 422 || status === 400)
    return "We couldn't process this card. Please check the details and try again.";
  return "The payment service is unavailable. Nothing was charged — please try again.";
}

export const createWhopPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => paymentSchema.parse(data))
  .handler(async ({ data }): Promise<WhopPaymentResult> => {
    const apiKey = process.env["WHOP_API_KEY"];
    const accountId = process.env["WHOP_COMPANY_ID"];

    if (!apiKey || !accountId) {
      console.error("Whop is not configured");
      return { ok: false, error: "Payments are not configured." };
    }

    const resolved = resolveTotal(data.pack, data.shipping);

    if (!resolved) {
      return { ok: false, error: "Invalid pack or delivery method." };
    }

    const { bundle, shipping, pence } = resolved;
    const title =
      STRIPE_PRODUCT_NAMES[bundle.id] ?? `Pack ${bundle.id}`;

    const metadata: Record<string, string> = {
      pack: bundle.id,
      shipping: shipping.id,
      amount_pence: String(pence),
      customer_name: `${data.firstName} ${data.lastName}`.trim().slice(0, 200),
      customer_phone: data.phone,
      ship_street: data.street,
      ship_apartment: data.apartment,
      ship_city: data.city,
      ship_postcode: data.postalCode.toUpperCase(),
      ship_country: "GB",
    };

    if (data.checkoutSessionId) {
      metadata["checkout_session_id"] = data.checkoutSessionId;
    }

    for (const key of ATTRIBUTION_KEYS) {
      const value = data.attribution[key];
      if (value) metadata[key] = value.slice(0, 250);
    }

    /* Matching signals for the server-side conversions (webhook). */
    try {
      const ttp = getCookie("_ttp");
      if (ttp) metadata["ttp"] = ttp.slice(0, 120);
      const ua = getRequestHeader("user-agent");
      if (ua) metadata["customer_ua"] = ua.slice(0, 350);
      const ip = getRequestIP({ xForwardedFor: true });
      if (ip) metadata["customer_ip"] = ip.slice(0, 64);
    } catch {
      /* Never block the payment on tracking signals. */
    }

    const body = {
      account_id: accountId,
      confirmation_token: data.confirmationToken,
      email: data.email,
      metadata,
      plan: {
        currency: "gbp",
        plan_type: "one_time",
        initial_price: pence / 100,
        description: `Pack ${bundle.id} + ${shipping.label}`,
        product: {
          external_identifier: `nl-pack-${bundle.id}`,
          title: `Pack ${bundle.id} - ${title}`,
          collect_shipping_address: false,
        },
      },
    };

    try {
      const res = await fetch(`${WHOP_API}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          /* Retries of the same token must not double charge. */
          "Idempotency-Key": data.confirmationToken,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const json = (await res.json().catch(() => ({}))) as WhopPayment & {
        error?: { message?: string; type?: string };
      };

      if (!res.ok || !json.id) {
        /* No card data or token in the log line. */
        console.error(
          "Whop create payment rejected",
          res.status,
          String(json.error?.message ?? "").slice(0, 300),
        );

        return {
          ok: false,
          error: friendlyError(res.status),
          code: `whop_${res.status}`,
        };
      }

      return {
        ok: true,
        paymentId: json.id,
        status: json.substatus ?? json.status ?? "pending",
        clientSecret: json.client_secret ?? null,
      };
    } catch (error) {
      console.error(
        "Whop create payment unavailable",
        error instanceof Error ? error.name : "error",
      );

      return {
        ok: false,
        error:
          "The payment is taking longer than expected. Please tap Pay now to try again.",
        code: "whop_timeout",
      };
    }
  });

/** Server-side status check; the browser status is never trusted. */
export const getWhopPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ paymentId: z.string().regex(/^pay_[A-Za-z0-9_]+$/).max(80) }).parse(data),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["WHOP_API_KEY"];
    if (!apiKey) return { ok: false as const, status: null };

    try {
      const res = await fetch(`${WHOP_API}/payments/${data.paymentId}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) return { ok: false as const, status: null };

      const json = (await res.json()) as WhopPayment;

      return {
        ok: true as const,
        status: json.substatus ?? json.status ?? null,
      };
    } catch {
      return { ok: false as const, status: null };
    }
  });
