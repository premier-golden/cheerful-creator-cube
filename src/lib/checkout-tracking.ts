/**
 * Browser-side checkout funnel tracker.
 *
 * 100% fire-and-forget: every call is wrapped so a
 * tracking failure can never block, delay or change
 * the payment flow, and never shows an error to the
 * buyer.
 */

import {
  getAttribution,
} from "./attribution";
import {
  UTM_KEYS,
  type CheckoutEvent,
} from "./checkout-events";
import { trackCheckoutStep } from "./checkout-events.functions";

const SESSION_KEY = "nl_checkout_session_id";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    /* fall through */
  }

  /* RFC4122-shaped fallback. */
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (char) => {
      const random = (Math.random() * 16) | 0;
      const value =
        char === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    },
  );
}

let memorySessionId: string | null = null;

/**
 * One stable UUID per checkout session, kept in
 * sessionStorage so every event of that session shares
 * it. Never regenerated on re-render.
 */
export function getCheckoutSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  if (memorySessionId) {
    return memorySessionId;
  }

  try {
    const stored =
      window.sessionStorage.getItem(SESSION_KEY);

    if (stored) {
      memorySessionId = stored;
      return stored;
    }
  } catch {
    /* storage unavailable (private/in-app browsers) */
  }

  const created = newId();
  memorySessionId = created;

  try {
    window.sessionStorage.setItem(
      SESSION_KEY,
      created,
    );
  } catch {
    /* keep the in-memory id */
  }

  return created;
}

/** Events that must be recorded at most once per session. */
const onceOnly = new Set<CheckoutEvent>([
  "checkout_view",
  "address_started",
  "address_completed",
  "shipping_options_viewed",
  "payment_element_loaded",
  "payment_succeeded",
  "css_load_failed",
]);

const alreadySent = new Set<string>();

export type CheckoutEventDetails = {
  pack?: string | null;
  shipping?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  paymentIntentId?: string | null;
};

/**
 * Records a funnel step. Returns immediately; the
 * request runs in the background and all failures are
 * swallowed.
 */
export function trackCheckout(
  event: CheckoutEvent,
  details: CheckoutEventDetails = {},
): void {
  if (typeof window === "undefined") return;

  try {
    const sessionId = getCheckoutSessionId();

    if (!sessionId) return;

    if (onceOnly.has(event)) {
      const key = `${sessionId}|${event}`;
      if (alreadySent.has(key)) return;
      alreadySent.add(key);
    }

    const attribution = getAttribution();

    const utm: Record<string, string> = {};

    for (const key of UTM_KEYS) {
      const value = attribution[key];
      if (value) utm[key] = value;
    }

    void trackCheckoutStep({
      data: {
        sessionId,
        event,
        ...(details.pack ? { pack: details.pack } : {}),
        ...(details.shipping
          ? { shipping: details.shipping }
          : {}),
        ...(details.errorCode
          ? { errorCode: details.errorCode }
          : {}),
        ...(details.errorMessage
          ? {
              errorMessage: details.errorMessage.slice(
                0,
                300,
              ),
            }
          : {}),
        ...(details.paymentIntentId
          ? {
              paymentIntentId:
                details.paymentIntentId,
            }
          : {}),
        utm,
        pathname: window.location.pathname,
      },
    }).catch(() => {});
  } catch {
    /* tracking must never throw into the caller */
  }
}

/**
 * Extracts the PaymentIntent id from a client secret.
 * The secret itself is NEVER sent to tracking.
 */
export function intentIdFromSecret(
  clientSecret: string | null | undefined,
): string | null {
  if (!clientSecret) return null;

  const marker = "_secret_";
  const position = clientSecret.indexOf(marker);

  if (position <= 0) return null;

  const id = clientSecret.slice(0, position);

  return id.startsWith("pi_") ? id : null;
}

/** Maps a Stripe error object to a safe, structured code. */
export function stripeErrorCode(error: {
  code?: string;
  decline_code?: string;
  declineCode?: string;
  type?: string;
}): string {
  const decline =
    error.decline_code ?? error.declineCode;

  return (
    decline ??
    error.code ??
    error.type ??
    "stripe_error"
  );
}
