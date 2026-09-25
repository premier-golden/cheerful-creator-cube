import { createFileRoute } from "@tanstack/react-router";

/**
 * Read-only Whop connectivity check.
 * Calls GET https://api.whop.com/api/v1/plans (official v1 API).
 * Never returns the key, headers or the raw Whop payload.
 */
const WHOP_API = "https://api.whop.com/api/v1";

const ERRORS: Record<number, string> = {
  400: "Bad request (missing or invalid parameter)",
  401: "Invalid API key or wrong authentication",
  403: "Key is valid but lacks permission",
  404: "Endpoint or resource not found",
  422: "Invalid parameters",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/whop-test")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env["WHOP_API_KEY"];
        const accountId = process.env["WHOP_COMPANY_ID"];
        if (!key) return json({ success: false, connected: false, error: "WHOP_API_KEY not configured" }, 500);
        if (!accountId)
          return json({ success: false, connected: false, error: "WHOP_COMPANY_ID not configured (required account_id)" }, 500);

        try {
          const res = await fetch(
            `${WHOP_API}/plans?account_id=${encodeURIComponent(accountId)}&first=1`,
            {
              headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
              signal: AbortSignal.timeout(10000),
            },
          );
          if (res.ok) {
            const data = (await res.json().catch(() => ({}))) as { data?: unknown[] };
            return json({
              success: true,
              connected: true,
              whopStatus: res.status,
              plansReturned: Array.isArray(data.data) ? data.data.length : 0,
            });
          }
          const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
          const message = String(body.error?.message ?? "").slice(0, 200);
          return json({
            success: false,
            connected: false,
            whopStatus: res.status,
            error: `${ERRORS[res.status] ?? "Whop API error"}${message ? `: ${message}` : ""}`,
          }, 502);
        } catch {
          return json({ success: false, connected: false, error: "Whop API unreachable or timed out" }, 502);
        }
      },
    },
  },
});
