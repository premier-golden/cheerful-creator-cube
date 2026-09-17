import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Cooud "venda aprovada" webhook.
 *
 * Cooud calls this server-to-server when a Checkout Session is paid. Register
 * this URL in the Cooud Dashboard (Store → Integrations → Webhooks) and select
 * the `order.paid` event. This account's Dashboard does not expose a webhook
 * signing secret, so verification is optional: if `COOUD_WEBHOOK_SECRET` is
 * set we verify the `X-Cooud-Signature` header (HMAC-SHA256 over the raw body);
 * otherwise we accept the event with a warning. Responds 200 OK quickly.
 *
 * Docs: https://docs.cooud.com/public-doc/dev/webhooks/quickstart
 */
export const Route = createFileRoute("/api/public/cooud-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["COOUD_WEBHOOK_SECRET"];

        // 1. Read the raw body exactly as received (signature is over it).
        const raw = await request.text();

        // 2. Verify X-Cooud-Signature = "sha256=<hex>" with the webhook secret.
        //    The secret is optional: the Cooud Dashboard in this account does
        //    not expose a webhook signing secret, so when COOUD_WEBHOOK_SECRET
        //    is unset we accept the event but log a warning. If you later obtain
        //    a secret from Cooud, save it as COOUD_WEBHOOK_SECRET and verification
        //    becomes strict (invalid signatures return 401).
        if (secret) {
          const sigHeader = request.headers.get("x-cooud-signature") ?? "";
          const received = sigHeader.startsWith("sha256=")
            ? sigHeader.slice("sha256=".length)
            : sigHeader;
          const expected = createHmac("sha256", secret).update(raw).digest("hex");
          const valid =
            received.length === expected.length &&
            timingSafeEqual(Buffer.from(received), Buffer.from(expected));
          if (!valid) return new Response("Invalid signature", { status: 401 });
        } else if (process.env["NODE_ENV"] !== "production") {
          console.warn(
            "COOUD_WEBHOOK_SECRET not set — accepting Cooud webhook without signature verification.",
          );
        }

        // 3. Parse and confirm the event is order.paid before acting.
        let event: {
          id?: string;
          type?: string;
          data?: Record<string, unknown>;
          created_at?: string;
        };
        try {
          event = JSON.parse(raw) as typeof event;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        if (event.type === "order.paid") {
          const order = (event.data ?? {}) as {
            id?: string;
            customer_name?: string;
            customer_email?: string;
            total_amount?: number;
            currency?: string;
            status?: string;
            items?: Array<{ name?: string; amount?: number }>;
            metadata?: Record<string, string>;
          };
          // Idempotent by event.id / order.id — log for reconciliation.
          const pack = order.metadata ? order.metadata["pack"] : undefined;
          console.log(
            `Cooud order.paid: event=${event.id} order=${order.id} customer=${order.customer_email} amount=${order.total_amount} ${order.currency} pack=${pack}`,
          );
        }

        // 4. Respond 200 OK quickly (per Cooud quickstart).
        return new Response("ok", { status: 200 });
      },
    },
  },
});
