import {
  formatAmount,
  parseAmount,
  type Bundle,
  type ShippingMethod,
  PRODUCT_NAME,
} from "@/lib/offer";

/**
 * Order summary column of the checkout.
 * Data comes entirely from the pack selected on the Main Offer.
 */
export function CheckoutSummary({
  bundle,
  shipping,
}: {
  bundle: Bundle;
  shipping?: ShippingMethod | null;
}) {
  const subtotal = parseAmount(bundle.price);
  const compare = parseAmount(bundle.compare);
  const savings = Math.max(compare - subtotal, 0);
  const shippingCost = shipping ? shipping.amount : 0;
  const total = subtotal + shippingCost;


  return (
    <div className="space-y-5">
      <ul className="space-y-4">
        <li className="flex items-start gap-4">
          <div className="size-16 shrink-0 overflow-hidden rounded-md border border-co-border bg-co-surface">
            <img
              src={bundle.image}
              alt={bundle.productName ?? PRODUCT_NAME}
              className="size-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium leading-5 text-co-fg">
              {bundle.productName ?? PRODUCT_NAME}
            </p>
            <p className="mt-0.5 text-xs text-co-muted">{bundle.variant ?? bundle.title}</p>
            <p className="mt-0.5 text-xs text-co-muted">Qty: {bundle.quantity ?? 1}</p>
          </div>
          <div className="text-right text-[13px]">
            <p className="font-medium text-co-fg">{bundle.price}</p>
            {compare > subtotal && (
              <p className="text-xs text-co-muted line-through">{bundle.compare}</p>
            )}
          </div>
        </li>

        {bundle.gifts.map((g) => (
          <li key={g.label} className="flex items-start gap-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-md border border-co-border bg-co-surface">
              <img src={g.image} alt="" className="size-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-5 text-co-fg">
                {g.label.replace(/^\+\s*/, "")}
              </p>
              <p className="mt-0.5 text-xs text-co-muted">Free gift</p>
              <p className="mt-0.5 text-xs text-co-muted">Qty: 1</p>
            </div>
            <div className="text-right text-[13px]">
              <p className="font-medium text-co-fg">Free</p>
              <p className="text-xs text-co-muted line-through">{g.value}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-2 border-t border-co-border pt-4 text-sm">
        <Row label={`Subtotal · ${bundle.quantity ?? 1} item${(bundle.quantity ?? 1) > 1 ? "s" : ""}`} value={bundle.price} />
        {savings > 0 && (
          <Row label="Discount" value={`-${formatAmount(savings)}`} muted />
        )}
        {shipping ? (
          <Row
            label={`Shipping · ${shipping.label}`}
            value={shippingCost === 0 ? "Free" : formatAmount(shippingCost)}
          />
        ) : (
          <Row label="Shipping" value="Enter shipping address" muted />
        )}
      </div>

      <div className="flex items-end justify-between border-t border-co-border pt-4">
        <span className="text-base font-medium text-co-fg">Total</span>
        <span className="flex items-baseline gap-2">
          <span className="text-xs text-co-muted">GBP</span>
          <span className="text-2xl font-semibold text-co-fg">{formatAmount(total)}</span>
        </span>
      </div>


      {savings > 0 && (
        <p className="rounded-md bg-co-savings px-3 py-2 text-[13px] font-medium text-co-savings-fg">
          TOTAL SAVINGS {formatAmount(savings)}
        </p>
      )}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-co-fg">{label}</span>
      <span className={muted ? "text-right text-xs text-co-muted" : "text-co-fg"}>{value}</span>
    </div>
  );
}
