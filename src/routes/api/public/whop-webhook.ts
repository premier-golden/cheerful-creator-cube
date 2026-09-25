import { createFileRoute } from "@tanstack/react-router";

/**
 * Whop webhook receiver (replaces the Stripe post-payment trigger).
 *
 * Whop uses Standard Webhooks: HMAC-SHA256 over
 * "{webhook-id}.{webhook-timestamp}.{raw body}", base64,
 * header "webhook-signature: v1,<sig>", 5 minute tolerance.
 * Docs: https://docs.whop.com/developer/guides/webhooks
 *
 * Nothing is processed before the signature is verified, and
 * the payload is never trusted: the payment is re-fetched from
 * the Whop API. Every side effect has its own atomic claim on
 * whop_payments so retries only complete what is missing.
 */
const WHOP_API = "https://api.whop.com/api/v1";
const UTMIFY_ORDERS_URL = "https://api.utmify.com.br/api-credentials/orders";
const TOLERANCE_SECONDS = 300;

type Admin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

function b64ToBytes(value: string): Uint8Array | null {
  try {
    const bin = atob(value);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacB64(key: Uint8Array, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message),
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/**
 * Candidate keys: the ws_ secret as given (Whop docs: "the key is
 * your ws_ secret") and the Standard Webhooks base64 form of the
 * part after the prefix. Both derive solely from our secret.
 */
function candidateKeys(secret: string): Uint8Array[] {
  const keys: Uint8Array[] = [new TextEncoder().encode(secret)];
  const stripped = secret.replace(/^(ws_|whsec_)/, "");
  const decoded = b64ToBytes(stripped);
  if (decoded && decoded.length > 0) keys.push(decoded);
  return keys;
}

async function verifySignature(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
  header: string,
): Promise<boolean> {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return false;

  const signatures = header
    .split(" ")
    .map((part) => part.split(",")[1] ?? "")
    .filter(Boolean);
  if (signatures.length === 0) return false;

  const message = `${id}.${timestamp}.${body}`;
  for (const key of candidateKeys(secret)) {
    const expected = await hmacB64(key, message);
    if (signatures.some((s) => safeEqual(s, expected))) return true;
  }
  return false;
}

type WhopPayment = {
  id?: string;
  status?: string | null;
  substatus?: string | null;
  currency?: string | null;
  total?: number | null;
  created_at?: string | null;
  paid_at?: string | null;
  metadata?: Record<string, unknown> | null;
  company?: { id?: string } | null;
  account?: { id?: string } | null;
  user?: { email?: string | null } | null;
  member?: { email?: string | null } | null;
};

function meta(payment: WhopPayment): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(payment.metadata ?? {})) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function utcDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return (isNaN(d.getTime()) ? new Date() : d)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

/** Atomically moves one side-effect column from pending/failed to "sending". */
async function claim(
  db: Admin,
  paymentId: string,
  column: "shopify_status" | "utmify_status" | "tiktok_status" | "attribution_status",
): Promise<boolean> {
  const { data } = await db
    .from("whop_payments" as never)
    .update({ [column]: "sending", updated_at: new Date().toISOString() } as never)
    .eq("payment_id", paymentId)
    .in(column, ["pending", "failed"])
    .select("payment_id");
  return Array.isArray(data) && data.length > 0;
}

async function mark(
  db: Admin,
  paymentId: string,
  values: Record<string, unknown>,
): Promise<void> {
  await db
    .from("whop_payments" as never)
    .update({ ...values, updated_at: new Date().toISOString() } as never)
    .eq("payment_id", paymentId);
}

async function fetchPayment(apiKey: string, id: string): Promise<WhopPayment | null> {
  const res = await fetch(`${WHOP_API}/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    console.error("Whop payment lookup failed", { paymentId: id, status: res.status });
    return null;
  }
  return (await res.json()) as WhopPayment;
}

async function processSucceeded(db: Admin, payment: WhopPayment): Promise<void> {
  const paymentId = payment.id!;
  const m = meta(payment);
  const currency = (payment.currency ?? "gbp").toUpperCase();
  const amountCents =
    typeof payment.total === "number"
      ? Math.round(payment.total * 100)
      : Number(m["amount_pence"] ?? 0);
  const email = payment.user?.email ?? payment.member?.email ?? m["customer_email"] ?? "";
  const name = m["customer_name"] || (email ? email.split("@")[0]! : "Customer");

  await mark(db, paymentId, {
    status: "succeeded",
    amount_cents: amountCents,
    currency,
    pack: m["pack"] ?? null,
    shipping: m["shipping"] ?? null,
  });

  /*
   * 1. Shopify. The existing Shopify order creation lives in the
   * Stripe-era backend function outside this codebase, so it is not
   * wired yet. The status stays "awaiting_integration" and is never
   * claimed, so it can be completed later without duplicates.
   */
  await db
    .from("whop_payments" as never)
    .update({ shopify_status: "awaiting_integration" } as never)
    .eq("payment_id", paymentId)
    .eq("shopify_status", "pending");

  /* 2. Admin dashboard attribution (same table the panel reads). */
  if (await claim(db, paymentId, "attribution_status")) {
    const { error } = await db.from("sale_attributions").upsert(
      {
        stripe_payment_intent_id: paymentId,
        amount_cents: amountCents,
        currency: currency.toLowerCase(),
        pack: m["pack"] ?? null,
        customer_name: name || null,
        customer_email: email || null,
        customer_country: "GB",
        utm_source: m["utm_source"] ?? null,
        utm_medium: m["utm_medium"] ?? null,
        utm_campaign: m["utm_campaign"] ?? null,
        utm_content: m["utm_content"] ?? null,
        utm_term: m["utm_term"] ?? null,
        src: m["src"] ?? null,
        sck: m["sck"] ?? null,
        fbclid: m["fbclid"] ?? null,
        ttclid: m["ttclid"] ?? null,
        gclid: m["gclid"] ?? null,
        livemode: true,
        paid_at: payment.paid_at ?? new Date().toISOString(),
      },
      { onConflict: "stripe_payment_intent_id" },
    );
    await mark(db, paymentId, { attribution_status: error ? "failed" : "done" });
  }

  /* 3. Utmify — same payload shape as the Stripe flow. */
  const utmifyToken = process.env["UTMIFY_API_TOKEN"];
  if (utmifyToken && (await claim(db, paymentId, "utmify_status"))) {
    let status = "failed";
    try {
      const res = await fetch(UTMIFY_ORDERS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-token": utmifyToken },
        body: JSON.stringify({
          orderId: paymentId,
          platform: "Whop",
          paymentMethod: "credit_card",
          status: "paid",
          createdAt: utcDate(payment.created_at),
          approvedDate: utcDate(payment.paid_at),
          refundedAt: null,
          customer: {
            name,
            email,
            phone: m["customer_phone"] || null,
            document: null,
            country: "GB",
            ip: m["customer_ip"] || null,
          },
          products: [
            {
              id: m["pack"] || "pack",
              name: `Pack ${m["pack"] ?? ""}`.trim(),
              planId: null,
              planName: null,
              quantity: 1,
              priceInCents: amountCents,
            },
          ],
          trackingParameters: {
            src: m["src"] || null,
            sck: m["sck"] || null,
            utm_source: m["utm_source"] || null,
            utm_medium: m["utm_medium"] || null,
            utm_campaign: m["utm_campaign"] || null,
            utm_content: m["utm_content"] || null,
            utm_term: m["utm_term"] || null,
          },
          commission: {
            totalPriceInCents: amountCents,
            gatewayFeeInCents: 0,
            userCommissionInCents: amountCents,
            currency,
          },
          isTest: false,
        }),
        signal: AbortSignal.timeout(8000),
      });
      /* 4xx is permanent: do not retry forever. */
      status = res.ok ? "sent" : res.status < 500 ? `rejected:${res.status}` : "failed";
      if (!res.ok) console.error("Utmify rejected Whop order", { paymentId, status: res.status });
    } catch {
      console.error("Utmify unavailable", { paymentId });
    }
    await mark(db, paymentId, { utmify_status: status });
    await db
      .from("sale_attributions")
      .update({ utmify_status: status })
      .eq("stripe_payment_intent_id", paymentId);
  }

  /*
   * 4. TikTok Events API. event_id = Whop payment id, the same value
   * the browser pixel uses (onPaid(paymentId)). The helper has its own
   * claim in tiktok_conversions and never throws.
   */
  if (await claim(db, paymentId, "tiktok_status")) {
    try {
      const { reportTikTokPurchase } = await import("@/lib/tiktok-events.server");
      await reportTikTokPurchase({
        eventId: paymentId,
        amount: amountCents / 100,
        currency,
        contentId: m["pack"] ?? null,
        contentName: `Pack ${m["pack"] ?? ""}`.trim(),
        quantity: 1,
        email: email || null,
        phone: m["customer_phone"] ?? null,
        ttclid: m["ttclid"] ?? null,
        ttp: m["ttp"] ?? null,
        ip: m["customer_ip"] ?? null,
        userAgent: m["customer_ua"] ?? null,
        createdAt: payment.created_at
          ? Math.floor(new Date(payment.created_at).getTime() / 1000)
          : null,
        testEventCode: process.env["TIKTOK_TEST_EVENT_CODE"] ?? null,
      });
      await mark(db, paymentId, { tiktok_status: "done" });
    } catch {
      await mark(db, paymentId, { tiktok_status: "failed" });
    }
  }

  await mark(db, paymentId, { processed_at: new Date().toISOString() });
}

export const Route = createFileRoute("/api/public/whop-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["WHOP_WEBHOOK_SECRET"];
        const apiKey = process.env["WHOP_API_KEY"];
        const accountId = process.env["WHOP_COMPANY_ID"];
        if (!secret || !apiKey || !accountId) {
          console.error("Whop webhook is not configured");
          return new Response("not configured", { status: 503 });
        }

        const id = request.headers.get("webhook-id") ?? "";
        const timestamp = request.headers.get("webhook-timestamp") ?? "";
        const signature = request.headers.get("webhook-signature") ?? "";
        const body = await request.text();

        if (!id || !(await verifySignature(secret, id, timestamp, body, signature))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: { type?: string; account_id?: string; company_id?: string; data?: { id?: string } };
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const type = event.type ?? "";
        const paymentId = event.data?.id ?? "";
        if (
          !["payment.succeeded", "payment.pending", "payment.failed"].includes(type) ||
          !/^pay_[A-Za-z0-9_]+$/.test(paymentId)
        ) {
          return new Response("ignored");
        }

        const envelopeAccount = event.account_id ?? event.company_id;
        if (envelopeAccount && envelopeAccount !== accountId) {
          return new Response("ignored");
        }

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

        /* Diagnostic log of the delivery (duplicates are harmless). */
        await db
          .from("whop_webhook_events" as never)
          .upsert({ webhook_id: id, event_type: type, payment_id: paymentId } as never, {
            onConflict: "webhook_id",
            ignoreDuplicates: true,
          });

        /* Reserve the payment row atomically (primary key = payment id). */
        await db
          .from("whop_payments" as never)
          .upsert({ payment_id: paymentId, last_event_type: type } as never, {
            onConflict: "payment_id",
            ignoreDuplicates: true,
          });

        if (type !== "payment.succeeded") {
          /* pending/failed: diagnostics only, never downgrade a success. */
          await db
            .from("whop_payments" as never)
            .update({
              status: type === "payment.failed" ? "failed" : "pending",
              last_event_type: type,
              updated_at: new Date().toISOString(),
            } as never)
            .eq("payment_id", paymentId)
            .neq("status", "succeeded");
          console.log("Whop payment event recorded", { paymentId, type });
          return new Response("ok");
        }

        /* Never trust the payload: re-fetch from Whop. */
        const payment = await fetchPayment(apiKey, paymentId);
        if (!payment?.id) return new Response("retry later", { status: 500 });

        const owner = payment.company?.id ?? payment.account?.id;
        const paid = payment.status === "paid" || payment.substatus === "succeeded";
        if ((owner && owner !== accountId) || !paid || (payment.currency ?? "").toLowerCase() !== "gbp") {
          console.warn("Whop payment failed verification", {
            paymentId,
            status: payment.status,
            substatus: payment.substatus,
          });
          return new Response("ignored");
        }

        try {
          await processSucceeded(db, payment);
        } catch {
          console.error("Whop fulfillment step failed", { paymentId });
          return new Response("retry later", { status: 500 });
        }

        console.log("Whop payment processed", { paymentId });
        return new Response("ok");
      },
    },
  },
});
