import { createFileRoute } from "@tanstack/react-router";

/**
 * Diagnostic passthrough proxy for the Cooud browser API calls.
 *
 * Why this exists: Cooud Elements (cdn.cooud.com/cdn/elements/v1.js) calls
 * `POST {apiBaseUrl}/v2/checkout-sessions/{id}/confirm` straight from the
 * browser and then REPLACES the API's real message with a generic buyer
 * string ("Payment failed. Try another card or contact the seller."), so the
 * real reason a payment is rejected is never visible to us.
 *
 * By pointing the SDK's `apiBaseUrl` at this route we:
 *  - forward the request unchanged to https://api.cooud.com (no secret key is
 *    involved: confirm is authenticated by the opaque cooud_session_secret),
 *  - log the exact HTTP status + real Cooud error body server-side,
 *  - copy the real message into `error.param`, the one field the SDK passes
 *    through to `onError`, so the checkout can show the true reason.
 *
 * Nothing is simulated: the buyer's confirm request really reaches Cooud.
 */
const COOUD_ORIGIN = "https://api.cooud.com";

const FORWARD_REQUEST_HEADERS = ["content-type", "cooud-compat-date", "idempotency-key"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Cooud-Compat-Date, Idempotency-Key",
  "Access-Control-Max-Age": "86400",
} as const;

function redact(value: string): string {
  return value
    .replace(/cooud_(?:sk|sess|elt)_[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+/g, "[redacted]");
}

function targetUrl(request: Request): string {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/public\/cooud-api/, "");
  return `${COOUD_ORIGIN}${path}${url.search}`;
}

async function proxy(request: Request): Promise<Response> {
  const target = targetUrl(request);
  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const body = request.method === "GET" ? null : await request.text();
  const upstream = await fetch(target, { method: request.method, headers, body });
  const text = await upstream.text();

  const isConfirm = target.includes("/confirm");
  if (isConfirm || !upstream.ok) {
    console.log(
      `[cooud-proxy] ${request.method} ${redact(target)} -> ${upstream.status} ${redact(text).slice(0, 1500)}`,
    );
    if (body) console.log(`[cooud-proxy] request body: ${redact(body).slice(0, 1000)}`);
  }

  // Surface the real Cooud message to the browser through `error.param`,
  // which Cooud Elements forwards untouched to our onError handler.
  let outBody = text;
  if (!upstream.ok) {
    try {
      const parsed = JSON.parse(text) as {
        error?: { message?: string; code?: string; decline_code?: string; param?: string };
      };
      if (parsed.error) {
        const detail = [
          `HTTP ${upstream.status}`,
          parsed.error.code,
          parsed.error.decline_code,
          parsed.error.message,
        ]
          .filter(Boolean)
          .join(" · ");
        parsed.error.param = detail;
        outBody = JSON.stringify(parsed);
      }
    } catch {
      /* non-JSON upstream body: forward as-is */
    }
  }

  const outHeaders = new Headers(CORS);
  outHeaders.set("content-type", upstream.headers.get("content-type") ?? "application/json");
  return new Response(outBody, { status: upstream.status, headers: outHeaders });
}

export const Route = createFileRoute("/api/public/cooud-api/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => proxy(request),
      POST: async ({ request }) => proxy(request),
    },
  },
});
