import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Password-protected sales attribution feed for the
 * internal admin dashboard. Read-only: it never
 * touches orders, payments, Shopify or pixels.
 */

const inputSchema = z.object({
  password: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(200).optional().default(50),
  campaign: z.string().max(250).optional(),
});

/**
 * Checkout funnel steps, in the visual order the
 * dashboard shows them. Sessions are aggregated
 * independently per event, so out-of-order events
 * are still counted correctly.
 */
export const FUNNEL_STEPS = [
  "checkout_view",
  "address_started",
  "address_completed",
  "shipping_options_viewed",
  "shipping_selected",
  "payment_element_loaded",
  "pay_clicked",
  "form_validation_passed",
  "prepare_order_succeeded",
  "elements_submit_succeeded",
  "confirm_payment_started",
  "payment_succeeded",
] as const;

export type FunnelStepRow = { event: string; sessions: number };
export type FunnelErrorRow = {
  errorCode: string;
  sessions: number;
  occurrences: number;
};

export type SaleAttributionRow = {
  id: string;
  stripePaymentIntentId: string;
  amountCents: number;
  currency: string;
  pack: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerCountry: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  src: string | null;
  sck: string | null;
  fbclid: string | null;
  ttclid: string | null;
  gclid: string | null;
  livemode: boolean;
  utmifyStatus: string | null;
  paidAt: string;
};

export type CheckoutInitiationRow = {
  id: string;
  pack: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  src: string | null;
  sck: string | null;
  createdAt: string;
};

export type SaleAttributionsResult =
  | { ok: false }
  | {
      ok: true;
      rows: Array<SaleAttributionRow>;
      initiations: Array<CheckoutInitiationRow>;
    };

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export const listSaleAttributions = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<SaleAttributionsResult> => {
    const expected = process.env["ADMIN_DASHBOARD_PASSWORD"];

    if (!expected || !timingSafeEqual(data.password, expected)) {
      return { ok: false };
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: rows, error } = await supabaseAdmin
      .from("sale_attributions")
      .select("*")
      .order("paid_at", { ascending: false })
      .limit(data.limit);

    if (error) {
      throw new Error(error.message);
    }

    const { data: icRows, error: icError } = await supabaseAdmin
      .from("checkout_initiations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (icError) {
      throw new Error(icError.message);
    }

    return {
      ok: true,
      initiations: (icRows ?? []).map((row) => ({
        id: row.id,
        pack: row.pack,
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        utmCampaign: row.utm_campaign,
        utmContent: row.utm_content,
        utmTerm: row.utm_term,
        src: row.src,
        sck: row.sck,
        createdAt: row.created_at,
      })),
      rows: (rows ?? []).map((row) => ({
        id: row.id,
        stripePaymentIntentId: row.stripe_payment_intent_id,
        amountCents: row.amount_cents,
        currency: row.currency,
        pack: row.pack,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        customerCountry: row.customer_country,
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        utmCampaign: row.utm_campaign,
        utmContent: row.utm_content,
        utmTerm: row.utm_term,
        src: row.src,
        sck: row.sck,
        fbclid: row.fbclid,
        ttclid: row.ttclid,
        gclid: row.gclid,
        livemode: row.livemode,
        utmifyStatus: row.utmify_status,
        paidAt: row.paid_at,
      })),
    };
  });
