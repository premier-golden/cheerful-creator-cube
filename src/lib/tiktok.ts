/**
 * TikTok Pixel helpers.
 *
 * The pixel snippet lives in the root route head (src/routes/__root.tsx) and
 * only fires `page()` automatically. Conversions (checkout started, purchase)
 * must be tracked explicitly — otherwise a real sale never shows up in TikTok
 * Events Manager.
 */

type Ttq = {
  track: (event: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void;
  identify?: (params: Record<string, unknown>) => void;
};

function ttq(): Ttq | null {
  if (typeof window === "undefined") return null;
  const q = (window as unknown as { ttq?: Ttq }).ttq;
  return q && typeof q.track === "function" ? q : null;
}

export type TikTokContent = {
  content_id: string;
  content_name?: string;
  content_type?: "product" | "product_group";
  quantity?: number;
  price?: number;
};

/** Fires a TikTok pixel event. Safe to call before the pixel script loads (queued). */
export function tiktokTrack(
  event: "ViewContent" | "AddToCart" | "InitiateCheckout" | "AddPaymentInfo" | "CompletePayment",
  params: {
    value?: number;
    currency?: string;
    contents?: TikTokContent[];
  } = {},
  eventId?: string,
) {
  const q = ttq();
  if (!q) return;
  try {
    q.track(
      event,
      {
        currency: params.currency ?? "GBP",
        ...params,
      },
      eventId ? { event_id: eventId } : undefined,
    );
  } catch {
    // Never let analytics break the checkout.
  }
}

/** Attaches buyer identity (hashed by the pixel) so TikTok can match the conversion. */
export function tiktokIdentify(email?: string | null, phone?: string | null) {
  const q = ttq();
  if (!q || typeof q.identify !== "function") return;
  const payload: Record<string, unknown> = {};
  if (email?.trim()) payload["email"] = email.trim().toLowerCase();
  if (phone?.trim()) payload["phone_number"] = phone.trim();
  if (!Object.keys(payload).length) return;
  try {
    q.identify(payload);
  } catch {
    // ignore
  }
}
