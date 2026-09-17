import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface AddressSuggestion {
  /** Full human-readable line shown in the dropdown. */
  label: string;
  /** Street line (house number + road). */
  street: string;
  city: string;
  postcode: string;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  county?: string;
  postcode?: string;
}

interface NominatimResult {
  display_name?: string;
  address?: NominatimAddress;
}

const inputSchema = z.object({ query: z.string().min(3).max(120) });

/**
 * UK address lookup used by the checkout address field.
 * Runs server-side so the upstream provider sees a stable User-Agent and the
 * browser never deals with CORS or rate-limit headers.
 */
export const searchAddresses = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<AddressSuggestion[]> => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", data.query);
    url.searchParams.set("countrycodes", "gb");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");

    let results: NominatimResult[] = [];
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "nutrition-geeks-checkout/1.0 (address autocomplete)",
          Accept: "application/json",
        },
      });
      if (!res.ok) return [];
      results = (await res.json()) as NominatimResult[];
    } catch {
      return [];
    }

    const seen = new Set<string>();
    const suggestions: AddressSuggestion[] = [];

    for (const item of results) {
      const a = item.address ?? {};
      const street = [a.house_number, a.road].filter(Boolean).join(" ").trim();
      const city = (a.city ?? a.town ?? a.village ?? a.suburb ?? a.county ?? "").trim();
      const postcode = (a.postcode ?? "").trim();
      if (!street && !postcode) continue;

      const label =
        [street, city, postcode].filter(Boolean).join(", ") || (item.display_name ?? "");
      if (!label || seen.has(label)) continue;
      seen.add(label);
      suggestions.push({ label, street, city, postcode });
    }

    return suggestions;
  });
