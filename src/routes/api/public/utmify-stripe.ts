import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe -> Utmify server-side conversion bridge.
 *
 * Stripe calls this endpoint when a payment
 * succeeds. The signature is verified before any
 * processing, then the sale is reported to Utmify
 * with the campaign parameters stored on the
 * PaymentIntent metadata.
 *
 * This endpoint never changes prices, orders,
 * Supabase data, Shopify or any pixel.
 */

const UTMIFY_ORDERS_URL =
  "https://api.utmify.com.br/api-credentials/orders";

const SIGNATURE_TOLERANCE_SECONDS = 300;

function timingSafeEqualHex(
  a: string,
  b: string,
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;

  for (
    let i = 0;
    i < a.length;
    i += 1
  ) {
    mismatch |=
      a.charCodeAt(i) ^
      b.charCodeAt(i);
  }

  return mismatch === 0;
}

async function hmacSha256Hex(
  secret: string,
  payload: string,
): Promise<string> {
  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        secret,
      ),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(
        payload,
      ),
    );

  return Array.from(
    new Uint8Array(signature),
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
}

async function verifyStripeSignature(
  body: string,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header) {
    return false;
  }

  let timestamp = "";

  const signatures: string[] = [];

  for (const part of header.split(
    ",",
  )) {
    const [prefix, value] =
      part.trim().split("=");

    if (!value) {
      continue;
    }

    if (prefix === "t") {
      timestamp = value;
    }

    if (prefix === "v1") {
      signatures.push(value);
    }
  }

  if (
    !timestamp ||
    signatures.length === 0
  ) {
    return false;
  }

  const age =
    Math.abs(
      Math.floor(Date.now() / 1000) -
        Number(timestamp),
    );

  if (
    !Number.isFinite(age) ||
    age > SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const expected =
    await hmacSha256Hex(
      secret,
      `${timestamp}.${body}`,
    );

  return signatures.some(
    (candidate) =>
      timingSafeEqualHex(
        candidate,
        expected,
      ),
  );
}

/**
 * Utmify only accepts ISO 3166-1 alpha-2 codes.
 * This store is United Kingdom only.
 */
function countryCode(
  value: string | undefined,
): string {
  const upper = (value ?? "")
    .trim()
    .toUpperCase();

  return /^[A-Z]{2}$/.test(upper)
    ? upper
    : "GB";
}

/** Utmify expects "YYYY-MM-DD HH:MM:SS" in UTC. */
function utcDate(
  seconds: number | undefined,
): string {
  const date =
    seconds
      ? new Date(seconds * 1000)
      : new Date();

  return date
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

type StripeIntent = {
  id?: string;
  amount?: number;
  amount_received?: number;
  currency?: string;
  created?: number;
  receipt_email?: string | null;
  description?: string | null;
  livemode?: boolean;

  metadata?: Record<
    string,
    string
  > | null;
};

/**
 * Persists the campaign parameters of a paid order so
 * the internal dashboard can show them in real time.
 * Never throws: reporting must not break the webhook.
 */
async function storeAttribution(
  intent: StripeIntent,
  metadata: Record<string, string>,
  amountInCents: number,
  name: string | undefined,
  email: string,
  utmifyStatus: string,
): Promise<void> {
  try {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    await supabaseAdmin
      .from("sale_attributions")
      .upsert(
        {
          stripe_payment_intent_id: intent.id!,
          amount_cents: amountInCents,
          currency: intent.currency ?? "gbp",
          pack: metadata["pack"] ?? null,
          customer_name: name || null,
          customer_email: email || null,
          customer_country:
            metadata["customer_country"] ?? null,
          utm_source: metadata["utm_source"] ?? null,
          utm_medium: metadata["utm_medium"] ?? null,
          utm_campaign: metadata["utm_campaign"] ?? null,
          utm_content: metadata["utm_content"] ?? null,
          utm_term: metadata["utm_term"] ?? null,
          src: metadata["src"] ?? null,
          sck: metadata["sck"] ?? null,
          fbclid: metadata["fbclid"] ?? null,
          ttclid: metadata["ttclid"] ?? null,
          gclid: metadata["gclid"] ?? null,
          livemode: intent.livemode !== false,
          utmify_status: utmifyStatus,
        },
        { onConflict: "stripe_payment_intent_id" },
      );
  } catch (error) {
    console.error(
      "Could not store sale attribution",
      error,
    );
  }
}


export const Route =
  createFileRoute(
    "/api/public/utmify-stripe",
  )({
    server: {
      handlers: {
        POST: async ({
          request,
        }) => {
          const webhookSecret =
            process.env[
              "STRIPE_UTMIFY_WEBHOOK_SECRET"
            ] ||
            process.env[
              "STRIPE_WEBHOOK_SECRET"
            ];

          const utmifyToken =
            process.env[
              "UTMIFY_API_TOKEN"
            ];

          if (
            !webhookSecret ||
            !utmifyToken
          ) {
            console.error(
              "utmify-stripe is not configured",
            );

            return new Response(
              "Not configured",
              { status: 500 },
            );
          }

          const body =
            await request.text();

          const valid =
            await verifyStripeSignature(
              body,
              request.headers.get(
                "stripe-signature",
              ),
              webhookSecret,
            );

          if (!valid) {
            return new Response(
              "Invalid signature",
              { status: 401 },
            );
          }

          let event: {
            type?: string;

            data?: {
              object?: StripeIntent;
            };
          };

          try {
            event =
              JSON.parse(body);
          } catch {
            return new Response(
              "Invalid payload",
              { status: 400 },
            );
          }

          if (
            event.type !==
            "payment_intent.succeeded"
          ) {
            return new Response(
              "ignored",
            );
          }

          const intent =
            event.data?.object;

          if (
            !intent?.id
          ) {
            return new Response(
              "ignored",
            );
          }

          const metadata =
            intent.metadata ?? {};

          const amountInCents =
            intent.amount_received ||
            intent.amount ||
            0;

          const email =
            intent.receipt_email ??
            metadata["customer_email"] ??
            "";

          const name =
            metadata["customer_name"] ||
            (email
              ? email.split("@")[0]
              : "Customer");

          const approvedAt =
            utcDate(undefined);

          const payload = {
            orderId: intent.id,

            platform: "Stripe",

            paymentMethod:
              "credit_card",

            status: "paid",

            createdAt:
              utcDate(
                intent.created,
              ),

            approvedDate:
              approvedAt,

            refundedAt: null,

            customer: {
              name,

              email,

              phone:
                metadata["customer_phone"] ||
                null,

              document: null,

              country:
                countryCode(
                  metadata["customer_country"],
                ),

              ip:
                metadata["customer_ip"] ||
                null,
            },

            products: [
              {
                id:
                  metadata["pack"] ||
                  "pack",

                name:
                  intent.description ||
                  "Order",

                planId: null,

                planName: null,

                quantity: 1,

                priceInCents:
                  amountInCents,
              },
            ],

            trackingParameters: {
              src:
                metadata["src"] || null,

              sck:
                metadata["sck"] || null,

              utm_source:
                metadata["utm_source"] ||
                null,

              utm_medium:
                metadata["utm_medium"] ||
                null,

              utm_campaign:
                metadata["utm_campaign"] ||
                null,

              utm_content:
                metadata["utm_content"] ||
                null,

              utm_term:
                metadata["utm_term"] ||
                null,
            },

            commission: {
              totalPriceInCents:
                amountInCents,

              gatewayFeeInCents: 0,

              userCommissionInCents:
                amountInCents,

              // Without this Utmify assumes BRL and
              // reports GBP sales as reais.
              currency: (
                intent.currency ?? "gbp"
              ).toUpperCase(),
            },

            isTest:
              intent.livemode ===
              false,
          };

          try {
            const res =
              await fetch(
                UTMIFY_ORDERS_URL,
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",

                    "x-api-token":
                      utmifyToken,
                  },

                  body:
                    JSON.stringify(
                      payload,
                    ),
                },
              );

            if (!res.ok) {
              console.error(
                "Utmify rejected the order",
                res.status,
                await res.text(),
              );

              await storeAttribution(
                intent,
                metadata,
                amountInCents,
                name,
                email,
                `rejected:${res.status}`,
              );

              /*
               * 200 keeps Stripe from retrying
               * forever on a permanent rejection.
               */
              return new Response(
                "utmify error",
              );
            }
          } catch (error) {
            console.error(
              "Utmify unavailable",
              error,
            );

            await storeAttribution(
              intent,
              metadata,
              amountInCents,
              name,
              email,
              "failed",
            );

            return new Response(
              "retry later",
              { status: 500 },
            );
          }

          await storeAttribution(
            intent,
            metadata,
            amountInCents,
            name,
            email,
            "sent",
          );

          return new Response("ok");
        },
      },
    },
  });
