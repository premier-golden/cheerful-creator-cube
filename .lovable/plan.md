# High-Fidelity Mobile Homepage Reconstruction

## Goal
Match the reference homepage closely around 390px wide while preserving the current prices, selected-pack checkout flow, Stripe, Supabase, Shopify/Wiio, UTMify, TikTok, and all server-side behavior.

## What will change
- Rework only the homepage presentation: announcement bar, header, gallery, product copy, benefits, gift notice, price styling, bundle cards, gift strips, primary Buy Now button, product accordions, featured logos, comparison section, reviews, FAQ, Trustpilot spacing, and footer.
- Remove only the mobile sticky purchase bar and its compensating bottom spacing; keep the main Buy Now link and its selected-pack behavior unchanged.
- Reorder and resize the gallery to match the reference, add its zoom control, and make thumbnails horizontally scrollable at the reference proportions.
- Rebuild the mobile FAQ into one divided panel and align review rows, pagination, footer newsletter, social icons, and graphical payment logos with the reference.
- Keep desktop functional by applying the reconstruction primarily through mobile-specific markup and responsive styles.

## Files in scope
- `src/routes/index.tsx`
- `src/components/site/Accordion.tsx`
- `src/components/site/Marquee.tsx`
- `src/components/site/Reviews.tsx`
- `src/styles.css` only if a homepage visual token or mobile utility is required
- New local visual assets only when the reference asset has no suitable existing project equivalent

## Protected and unchanged
- No checkout files, payment components, server functions, Supabase integration, Shopify/Wiio logic, secrets, environment variables, shipping or product values.
- No changes to `src/lib/offer.ts`, including pack IDs, prices, shipping, calculations, or Stripe descriptions.
- No changes to `src/routes/__root.tsx`; both UTMify scripts and the TikTok pixel remain exactly intact.
- The existing Buy Now destination, selected pack query, and TikTok AddToCart call remain intact.

## Verification
- Compare full-page screenshots of the reference and local homepage at 390px, section by section.
- Confirm all six gallery thumbnails remain usable, accordions open, review controls work, and each pack still reaches the existing checkout with the correct pack ID.
- Confirm the mobile sticky bar is absent, no horizontal overflow exists outside the intended thumbnail scroller, prices remain £16.99 / £44.99 / £83.99, and the latest preview build is clean.