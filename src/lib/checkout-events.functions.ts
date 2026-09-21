import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  CHECKOUT_EVENTS,
  UTM_KEYS,
} from "./checkout-events";

/**
 * Persists a single checkout funnel step.
 *
 * Write-only, server-side. It validates and
 * sanitises everything before touching the database
 * and NEVER participates in the payment path: a
 * failure here can only lose an analytics row.
 *
 * No card data, client secret or credential is
 * accepted or stored.
 */

const inputSchema = z.object({
  sessionId: z.string().uuid(),
  event: z.enum(CHECKOUT_EVENTS),
  pack: z.string().max(50).optional(),
  shipping: z.string().max(50).optional(),
  errorCode: z.string().max(60).optional(),
  errorMessage: z.string().max(300).optional(),
  paymentIntentId: z
    .string()
    .max(80)
    .regex(/^pi_[A-Za-z0-9_]+$/)
    .optional(),
  utm: z
    .record(z.enum(UTM_KEYS), z.string().max(250))
    .optional()
    .default({}),
  pathname: z.string().max(200).optional(),
});

/**
 * Basic abuse protection.
 *
 * Best-effort in-memory sliding window per checkout
 * session. Workers are stateless, so this only caps
 * bursts from a single warm instance — enough to stop
 * a loop hammering the endpoint, while never being
 * able to reject a legitimate checkout's payment.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 60;

const hits = new Map<string, number[]>();

function rateLimited(sessionId: string): boolean {
  const now = Date.now();

  const recent = (hits.get(sessionId) ?? []).filter(
    (time) => now - time < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT_MAX_EVENTS) {
    hits.set(sessionId, recent);
    return true;
  }

  recent.push(now);
  hits.set(sessionId, recent);

  if (hits.size > 5000) {
    hits.clear();
  }

  return false;
}

function clean(value: string | undefined, max: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export const trackCheckoutStep = createServerFn({
  method: "POST",
})
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    if (rateLimited(data.sessionId)) {
      return { ok: true, skipped: true };
    }

    const userAgent =
      clean(getRequestHeader("user-agent"), 300);

    const row = {
      checkout_session_id: data.sessionId,
      event: data.event,
      pack: clean(data.pack, 50),
      shipping: clean(data.shipping, 50),
      error_code: clean(data.errorCode, 60),
      error_message: clean(data.errorMessage, 300),
      stripe_payment_intent_id: clean(
        data.paymentIntentId,
        80,
      ),
      pathname: clean(data.pathname, 200),
      user_agent: userAgent,
      utm_source: clean(data.utm.utm_source, 250),
      utm_medium: clean(data.utm.utm_medium, 250),
      utm_campaign: clean(
        data.utm.utm_campaign,
        250,
      ),
      utm_content: clean(data.utm.utm_content, 250),
      utm_term: clean(data.utm.utm_term, 250),
    };

    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      await supabaseAdmin
        .from("checkout_events")
        .insert(row);
    } catch {
      /*
       * Analytics must never surface an error to the
       * buyer or to the payment flow.
       */
    }

    return { ok: true };
  });
