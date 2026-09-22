/**
 * TikTok Events API (server-side conversions).
 *
 * Called only after our Stripe webhook has verified a
 * real `payment_intent.succeeded`. Fully isolated:
 * every failure is swallowed and logged, so TikTok can
 * never break the paid-order workflow (Supabase order,
 * Shopify, Wiio).
 *
 * The access token exists only here, read from the
 * server environment. It is never returned to the
 * browser, never stored on Stripe metadata and never
 * logged.
 */

const TIKTOK_EVENTS_URL =
  "https://business-api.tiktok.com/open_api/v1.3/event/track/";

const TIKTOK_PIXEL_ID =
  "DA9PBQ3C77UES9748K1G";

const REQUEST_TIMEOUT_MS = 8000;

async function sha256Hex(
  value: string,
): Promise<string> {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    );

  return Array.from(
    new Uint8Array(digest),
  )
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

export type TikTokPurchase = {
  /** Deterministic: the Stripe PaymentIntent id. */
  eventId: string;
  amount: number;
  currency: string;
  contentId?: string | null;
  contentName?: string | null;
  quantity?: number | null;
  email?: string | null;
  phone?: string | null;
  ttclid?: string | null;
  ttp?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt?: number | null;
  testEventCode?: string | null;
};

/**
 * Claims the conversion for this PaymentIntent.
 * Returns false when the sale was already reported
 * (Stripe webhook retries must not duplicate it).
 */
async function claimConversion(
  intentId: string,
  amountCents: number,
  currency: string,
): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { error } = await supabaseAdmin
      .from("tiktok_conversions")
      .insert({
        stripe_payment_intent_id: intentId,
        status: "sending",
        amount_cents: amountCents,
        currency,
      });

    if (error) {
      /* Unique violation = already handled. */
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "TikTok conversion claim failed",
      error,
    );

    return false;
  }
}

async function markConversion(
  intentId: string,
  status: string,
  detail?: string,
): Promise<void> {
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    await supabaseAdmin
      .from("tiktok_conversions")
      .update({
        status,
        detail: detail ? detail.slice(0, 400) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_payment_intent_id", intentId);
  } catch (error) {
    console.error(
      "TikTok conversion status not stored",
      error,
    );
  }
}

/**
 * Reports a confirmed purchase to TikTok.
 * Never throws.
 */
export async function reportTikTokPurchase(
  purchase: TikTokPurchase,
): Promise<void> {
  try {
    const token =
      process.env["TIKTOK_EVENTS_ACCESS_TOKEN"];

    if (!token) {
      console.error(
        "TIKTOK_EVENTS_ACCESS_TOKEN is not configured",
      );

      return;
    }

    const amountCents = Math.round(
      purchase.amount * 100,
    );

    const claimed = await claimConversion(
      purchase.eventId,
      amountCents,
      purchase.currency,
    );

    if (!claimed) {
      /* Already reported: webhook retry. */
      return;
    }

    const user: Record<string, unknown> = {};

    const email = purchase.email?.trim().toLowerCase();

    if (email) {
      user["email"] = await sha256Hex(email);
    }

    const phone = purchase.phone?.replace(/[^\d+]/g, "");

    if (phone) {
      user["phone"] = await sha256Hex(phone);
    }

    if (purchase.ttclid) {
      user["ttclid"] = purchase.ttclid;
    }

    if (purchase.ttp) {
      user["ttp"] = purchase.ttp;
    }

    if (purchase.ip) {
      user["ip"] = purchase.ip;
    }

    if (purchase.userAgent) {
      user["user_agent"] = purchase.userAgent;
    }

    const contents = purchase.contentId
      ? [
          {
            content_id: purchase.contentId,
            content_type: "product",
            ...(purchase.contentName
              ? { content_name: purchase.contentName }
              : {}),
            quantity: purchase.quantity ?? 1,
            price: purchase.amount,
          },
        ]
      : [];

    const body = {
      event_source: "web",
      event_source_id: TIKTOK_PIXEL_ID,

      ...(purchase.testEventCode
        ? { test_event_code: purchase.testEventCode }
        : {}),

      data: [
        {
          event: "CompletePayment",
          event_time:
            purchase.createdAt ??
            Math.floor(Date.now() / 1000),
          /* Same id as the browser pixel: dedupe. */
          event_id: purchase.eventId,
          user,
          properties: {
            currency: purchase.currency,
            value: purchase.amount,
            content_type: "product",
            ...(contents.length ? { contents } : {}),
          },
        },
      ],
    };

    const res = await fetch(TIKTOK_EVENTS_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Access-Token": token,
      },

      body: JSON.stringify(body),

      signal: AbortSignal.timeout(
        REQUEST_TIMEOUT_MS,
      ),
    });

    const text = await res.text();

    let code: number | undefined;

    try {
      code = (
        JSON.parse(text) as { code?: number }
      ).code;
    } catch {
      /* keep the raw text for diagnosis */
    }

    if (!res.ok || (code !== undefined && code !== 0)) {
      /* Response text carries no personal data. */
      console.error(
        "TikTok Events API rejected the purchase",
        res.status,
        text.slice(0, 300),
      );

      await markConversion(
        purchase.eventId,
        `rejected:${res.status}`,
        text,
      );

      return;
    }

    await markConversion(purchase.eventId, "sent");
  } catch (error) {
    console.error(
      "TikTok Events API unavailable",
      error,
    );

    await markConversion(
      purchase.eventId,
      "failed",
      error instanceof Error ? error.message : "error",
    );
  }
}
