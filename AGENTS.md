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
