/**
 * Campaign attribution capture.
 *
 * The parameters are read on the first page the
 * visitor lands on and kept for the whole session,
 * so they are still available at payment time.
 *
 * This module never touches pricing, payment or
 * tracking pixels.
 */

const STORAGE_KEY =
  "nl_attribution";

export const ATTRIBUTION_KEYS =
  [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "src",
    "sck",
    "fbclid",
    "ttclid",
    "gclid",
  ] as const;

export type Attribution =
  Partial<
    Record<
      (typeof ATTRIBUTION_KEYS)[number],
      string
    >
  >;

function readStored(): Attribution {
  try {
    const raw =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      );

    if (!raw) {
      return {};
    }

    const parsed =
      JSON.parse(raw) as unknown;

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return {};
    }

    return parsed as Attribution;
  } catch {
    return {};
  }
}

/**
 * Merges the current URL parameters into the
 * stored attribution. Existing values win, so the
 * first touch of the session is preserved.
 */
export function captureAttribution(): Attribution {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  const stored =
    readStored();

  const params =
    new URLSearchParams(
      window.location.search,
    );

  let changed = false;

  for (const key of ATTRIBUTION_KEYS) {
    if (stored[key]) {
      continue;
    }

    const value =
      params.get(key)?.trim();

    if (value) {
      stored[key] =
        value.slice(0, 250);

      changed = true;
    }
  }

  if (changed) {
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(stored),
      );
    } catch {
      /* storage unavailable */
    }
  }

  return stored;
}

export function getAttribution(): Attribution {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  return captureAttribution();
}
