/**
 * Builds the /checkout URL for a pack.
 *
 * The CTA uses a real document navigation, so the
 * campaign parameters must travel in the URL itself
 * instead of relying only on sessionStorage (which is
 * unavailable in private/in-app browsers).
 */

import {
  ATTRIBUTION_KEYS,
  getAttribution,
} from "./attribution";

export function buildCheckoutHref(
  pack: string,
): string {
  const params =
    new URLSearchParams();

  params.set("pack", pack);

  if (
    typeof window !==
    "undefined"
  ) {
    const current =
      new URLSearchParams(
        window.location.search,
      );

    const stored =
      getAttribution();

    for (const key of ATTRIBUTION_KEYS) {
      const value =
        current.get(key)?.trim() ||
        stored[key];

      if (value) {
        params.set(
          key,
          value.slice(0, 250),
        );
      }
    }
  }

  return `/checkout?${params.toString()}`;
}
