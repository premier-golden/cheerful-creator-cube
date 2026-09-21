import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Records a checkout initiation (IC) with the
 * campaign attribution captured on landing.
 * Write-only, server-side; never touches
 * payments, orders, Shopify or pixels.
 */

const ATTRIBUTION_KEYS = [
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

const inputSchema = z.object({
  pack: z.string().max(50).optional(),
  attribution: z
    .record(z.enum(ATTRIBUTION_KEYS), z.string().max(250))
    .optional()
    .default({}),
});

export const recordCheckoutInitiation = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const row: Record<string, string | null> = { pack: data.pack ?? null };
    for (const key of ATTRIBUTION_KEYS) {
      row[key] = data.attribution[key] ?? null;
    }

    const { error } = await supabaseAdmin
      .from("checkout_initiations")
      .insert(row);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });
