# High-fidelity mobile checkout reconstruction

## Goal
Match the previously inspected checkout reference at approximately 390px while preserving the current UK checkout, prices, Stripe Payment Element, order pipeline, and tracking.

## Scope
- Rebuild the mobile header proportions and add a state-driven collapsible order summary immediately below it.
- Tighten mobile page margins, typography, spacing, fields, shipping choices, payment framing, summary rows, CTA, and valid legal-link presentation.
- Keep desktop functional with responsive classes and retain the current two-column desktop checkout.
- Use the existing bundle, shipping, savings, and total data; add no new pricing or discount behavior.
- Keep the real Stripe Payment Element and every existing payment handler. Only adjust its supported appearance options and surrounding presentation.
- Non-negotiable payment methods: Stripe card payment only. Never add PayPal buttons, logos, rows, placeholders, simulated UI, Express Checkout, or any method copied from the reference. Never replace Stripe fields with custom or fake card inputs.
- Hide the optional “Save this information” row on mobile without changing payment data handling.

## Protected
No changes to `src/lib/stripe.functions.ts`, `src/lib/offer.ts`, `src/routes/__root.tsx`, server functions, secrets, tracking, Supabase, Shopify, Wiio, webhook logic, pack IDs, product prices, shipping prices, or amount calculations.

## Verification
- Validate packs £16.99 / £44.99 / £83.99 and shipping £6.91 / £10.26.
- Confirm United Kingdom, field names/bindings, postcode behavior, summary state, shipping-driven totals, Stripe mount, errors/loading, and the original pay handler.
- Compare mobile screenshots at 390px and confirm no horizontal overflow.
