<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Payments go through Whop Elements (src/components/checkout/WhopPaymentElement.tsx) + src/lib/whop.functions.ts; browser sends only pack/shipping ids and a ctok_, server prices from offer.ts and creates an inline plan. Why: price can never be set by the browser.

- Whop post-payment runs in src/routes/api/public/whop-webhook.ts (Standard Webhooks signature, re-fetch payment, per-step claims on whop_payments). Why: retries must only finish missing steps, never duplicate orders or conversions.

- Shopify orders are created only by the Supabase Edge Function shopify-bridge (idempotent by whopPaymentId), called server-to-server from whop-webhook with X-Shopify-Bridge-Secret. Why: Shopify credentials live only in Supabase.

- The £1 live Whop payment check uses checkout pack=test with shipping=none; after signed webhook verification it records the paid test but bypasses Shopify, sale attribution, UTMify, and TikTok conversions. Why: testing the real payment rail must not create a product order or distort sales.

- The /thank-you route mirrors the referenced project's confirmation screen and uses the local logo pointer; the checkout navigates there after a server-confirmed payment. Why: confirmation page is presentation-only; fulfillment still runs only in the signed webhook.
- The email sent to Whop in createWhopPayment duplicates the last character before the "@" (owner-requested obfuscation); the real email stays in our own records. Why: store owner wants the Whop-side email altered.
- Whop may add its fee on top of the plan price, so webhook amount verification matches the server-set metadata amount_pence and requires total >= expected, never exact equality with total. Why: a £1 test charged as £1.20 was rejected as "amount mismatch".
