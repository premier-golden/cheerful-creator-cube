import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getBundle, parseAmount, CURRENCY_SYMBOL, PRODUCT_NAME } from "./offer";

const orderSchema = z.object({
  pack: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  country: z.string().min(1),
  postalCode: z.string().min(1),
  street: z.string().min(1),
  apartment: z.string().optional().default(""),
  city: z.string().min(1),
  phone: z.string().optional().default(""),
});

export type OrderInput = z.input<typeof orderSchema>;

/**
 * Fires on an approved payment: sends the full customer + order payload to the
 * tracking platform webhook so the tracking code is emailed automatically.
 */
export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderSchema.parse(data))
  .handler(async ({ data }) => {
    const webhookUrl = process.env["TRACKING_WEBHOOK_URL"];
    const bundle = getBundle(data.pack);
    const total = parseAmount(bundle.price);
    const orderNumber = `NG-${Date.now().toString(36).toUpperCase()}`;

    const payload = {
      event: "payment_approved",
      order: {
        order_number: orderNumber,
        status: "paid",
        payment_status: "approved",
        currency: "GBP",
        currency_symbol: CURRENCY_SYMBOL,
        total,
        total_formatted: bundle.price,
        created_at: new Date().toISOString(),
        items: [
          {
            name: bundle.productName ?? PRODUCT_NAME,
            variant: bundle.variant ?? bundle.title,
            quantity: bundle.quantity ?? 1,
            price: total,
          },
          ...bundle.gifts.map((g) => ({
            name: g.label.replace(/^\+\s*/, ""),
            variant: "Free gift",
            quantity: 1,
            price: 0,
          })),
        ],
      },
      customer: {
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        name: `${data.firstName} ${data.lastName}`.trim(),
        phone: data.phone,
      },
      shipping_address: {
        first_name: data.firstName,
        last_name: data.lastName,
        street: data.street,
        complement: data.apartment,
        city: data.city,
        country: data.country,
        phone: data.phone,
      },
    };

    if (!webhookUrl) {
      console.error("TRACKING_WEBHOOK_URL is not configured");
      return { ok: false as const, orderNumber, tracking: false as const };
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error(`Tracking webhook failed: ${res.status} ${await res.text()}`);
        return { ok: true as const, orderNumber, tracking: false as const };
      }
    } catch (error) {
      console.error(error);
      return { ok: true as const, orderNumber, tracking: false as const };
    }

    return { ok: true as const, orderNumber, tracking: true as const };
  });
