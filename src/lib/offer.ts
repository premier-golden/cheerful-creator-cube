/**
 * Single source of truth for the Main Offer (homepage) packs.
 *
 * The homepage renders these packs, and the Checkout reads the selected pack
 * from this same list (by `id`, passed as the `?pack=` search param).
 * Edit packs here and both the offer and the checkout stay in sync.
 */

export const CDN = "https://www.nutritiongeeks.co/cdn/shop/files";

export const BIOTIN = `${CDN}/biotin-growth-nutrition-geeks-image-position_c7b0fb03.png?v=1778516594&width=200`;
export const MAGNESIUM = `${CDN}/magnesium-glycinate-3-in-1-nutrition-geeks-image-position_dbd9aad3.png?v=1753719782&width=200`;

export type Gift = { image: string; label: string; value: string };

export type Bundle = {
  id: string;
  image: string;
  title: string;
  perPack: string;
  supply: string;
  /** Selling price, formatted (e.g. "£16.99") */
  price: string;
  /** Compare-at price, formatted */
  compare: string;
  badge?: string;
  gifts: Gift[];
  /** Product name shown in the checkout line item */
  productName?: string;
  /** Units in the pack (checkout quantity) */
  quantity?: number;
  /** Variant/option label shown in the checkout line item */
  variant?: string;
};

export const PRODUCT_NAME = "Collagen Glow Up Powder";
export const CURRENCY_SYMBOL = "£";

export const BUNDLES: Bundle[] = [
  {
    id: "1",
    image: `${CDN}/1_pack_1.png?v=1775710196&width=300`,
    title: "1 Pack",
    perPack: "£16.99 per pack",
    supply: "1 month supply",
    price: "£16.99",
    compare: "£19.99",
    gifts: [],
    productName: PRODUCT_NAME,
    quantity: 1,
    variant: "1 Pack / 1 month supply",
  },
  {
    id: "3",
    image: `${CDN}/3_pack_1.png?v=1775710196&width=300`,
    title: "3 Packs",
    perPack: "£8.33 per pack",
    supply: "3 months supply",
    price: "£24.99",
    compare: "£50.97",
    badge: "Free Gift 🎁",
    gifts: [{ image: BIOTIN, label: "+ FREE Biotin Growth+ (£6.99)", value: "£6.99" }],
    productName: PRODUCT_NAME,
    quantity: 3,
    variant: "3 Packs / 3 months supply",
  },
  {
    id: "6",
    image: `${CDN}/6_pack_1.png?v=1775710196&width=300`,
    title: "6 Packs",
    perPack: "£7.17 per pack",
    supply: "6 months supply",
    price: "£42.99",
    compare: "£101.94",
    badge: "Free Gift 🎁",
    gifts: [
      { image: BIOTIN, label: "+ FREE Biotin Growth+ (£6.99)", value: "£6.99" },
      { image: MAGNESIUM, label: "+ FREE Magnesium (£9.99)", value: "£9.99" },
    ],
    productName: PRODUCT_NAME,
    quantity: 6,
    variant: "6 Packs / 6 months supply",
  },
];

export const DEFAULT_BUNDLE_ID = BUNDLES[0]!.id;

/** Shipping methods offered once a valid UK postcode is entered. */
export type ShippingMethod = {
  id: string;
  label: string;
  description: string;
  /** Price in GBP */
  amount: number;
};

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "standard",
    label: "Standard Delivery",
    description: "",
    amount: 6,
  },
  {
    id: "express",
    label: "Express Delivery",
    description: "",
    amount: 12,
  },
];

/** Basic UK postcode validation (e.g. "SW1A 1AA", "M1 1AE"). */
export function isValidUkPostcode(value: string): boolean {
  return /^([Gg][Ii][Rr] ?0[Aa]{2}|[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2})$/.test(
    value.trim(),
  );
}

export function getBundle(id?: string | null): Bundle {
  return BUNDLES.find((b) => b.id === id) ?? BUNDLES[0]!;
}

/** Shipping method by id (null when none/unknown is selected). */
export function getShippingMethod(id?: string | null): ShippingMethod | null {
  return SHIPPING_METHODS.find((m) => m.id === id) ?? null;
}

/** "£24.99" -> 24.99 */
export function parseAmount(formatted: string): number {
  const n = Number(formatted.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatAmount(value: number): string {
  return `${CURRENCY_SYMBOL}${value.toFixed(2)}`;
}
