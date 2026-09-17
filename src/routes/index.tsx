import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, Gift, ChevronDown, Facebook, Instagram } from "lucide-react";
import { Marquee } from "@/components/site/Marquee";
import { AccordionItem } from "@/components/site/Accordion";
import { Reviews } from "@/components/site/Reviews";
import { BUNDLES, parseAmount } from "@/lib/offer";
import { tiktokTrack } from "@/lib/tiktok";
import heroAsset from "@/assets/collagen-hero.png.asset.json";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Collagen Glow Up Powder | Triple Filtered Collagen" },
      {
        name: "description",
        content:
          "All-natural, triple-filtered premium collagen powder with 12.6g of protein per serving. Mixes into hot drinks and food. Free gift when you spend £22+.",
      },
      { property: "og:title", content: "Collagen Glow Up Powder | Triple Filtered Collagen" },
      {
        property: "og:description",
        content:
          "Premium triple-filtered collagen powder, 12.6g protein per serving. Rated 'Excellent' by 4,000,000+ customers.",
      },
      {
        property: "og:image",
        content:
          "https://www.nutritiongeeks.co/cdn/shop/files/collagen-glow-up-powder-nutrition-geeks-image-position-3_9167bbb8.png?v=1779640309&width=1200",
      },
      {
        name: "twitter:image",
        content:
          "https://www.nutritiongeeks.co/cdn/shop/files/collagen-glow-up-powder-nutrition-geeks-image-position-3_9167bbb8.png?v=1779640309&width=1200",
      },
    ],
  }),
  component: ProductPage,
});

const CDN = "https://www.nutritiongeeks.co/cdn/shop/files";

const GALLERY = [
  heroAsset.url,
  `${CDN}/collagen-glow-up-powder-nutrition-geeks-image-position-3_9167bbb8.png?v=1779640309&width=900`,
  `${CDN}/collagen-glow-up-powder-nutrition-geeks-image-position-4.png?v=1784565383&width=900`,
  `${CDN}/collagen-glow-up-powder-nutrition-geeks-image-position-5.png?v=1784565383&width=900`,
  `${CDN}/collagen-glow-up-powder-nutrition-geeks-image-position-7.png?v=1784565397&width=900`,
  `${CDN}/collagen-glow-up-powder-nutrition-geeks-image-position-8.png?v=1784565397&width=900`,
  `${CDN}/collagen-glow-up-powder-nutrition-geeks-image-position-9.png?v=1777739465&width=900`,
];

// Packs live in @/lib/offer so the Checkout can read the same data.


const BENEFITS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: "🏃‍♀️",
    title: "High-Protein Nutrition",
    body: "Collagen Glow Up is over 90% protein, delivering 12.6g per serving as part of your daily diet.",
  },
  {
    emoji: "🌟",
    title: "Skin Structure",
    body: "Collagen is the most abundant protein found naturally in the human body and accounts for approximately 70–80% of the skin's connective tissue layer (the dermis). Collagen production naturally declines from early adulthood, typically from the mid-20s, meaning existing collagen fibres are renewed less tightly and less regularly over time, reflecting normal age-related changes in protein structure.",
  },
  {
    emoji: "💇‍♀️",
    title: "Stronger Hair & Nails",
    body: "When you stock up on 3 or more packs of Collagen you'll get a free 3 month supply of Biotin Growth+*. The biotin supplied with collagen contributes to naturally stronger and healthy hair & nails.",
  },
];

const FORMULA: { emoji: string; title: string; body: string }[] = [
  {
    emoji: "🧪",
    title: "Triple Filtered Collagen",
    body: "Our collagen is crafted through a careful Triple Filtering Process. We select premium raw materials, process the best batches in the UK, and test for protein, amino acids, and sensory quality. The result is the highest quality collagen in the UK, that's virtually odourless & tasteless.",
  },
  {
    emoji: "🧑‍🔬",
    title: "Expert-Led Development",
    body: "We've worked alongside the UK's leading collagen experts with over 40 years of industry experience to provide you with the most premium level of collagen available in the UK.",
  },
  {
    emoji: "🌱",
    title: "Pristine and Pure",
    body: "Sourced from grass-fed, pasture-raised Brazilian cattle, we offer an all-natural solution and free from artificial additives and common allergens.",
  },
];

const NUTRITION: [string, string, string][] = [
  ["Energy", "211kJ / 50kcal", "1505kJ / 360kcal"],
  ["Fat", "0g", "0g"],
  ["of which Saturates", "0g", "0g"],
  ["Carbohydrates", "0g", "0g"],
  ["of which Sugars", "0g", "0g"],
  ["Protein", "12.6g", "90g"],
  ["Salt", "0.0007g", "0.005g"],
];

const AMINO: [string, string, string][] = [
  ["Alanine", "1284mg", "9170mg"],
  ["Arginine", "1145mg", "8180mg"],
  ["Aspartic acid", "819mg", "5850mg"],
  ["Cysteine", "49mg", "350mg"],
  ["Glutamic acid", "1436mg", "10260mg"],
  ["Glycine", "3382mg", "24160mg"],
  ["Histidine†", "102mg", "730mg"],
  ["Hydroxyproline", "1595mg", "11390mg"],
  ["Isoleucine†", "209mg", "1490mg"],
  ["Leucine†", "403mg", "2880mg"],
  ["Lysine", "540mg", "3860mg"],
  ["Methionine†", "80mg", "570mg"],
  ["Phenylalanine†", "244mg", "1740mg"],
  ["Proline", "1907mg", "13620mg"],
  ["Serine", "470mg", "3360mg"],
  ["Threonine†", "224mg", "1600mg"],
  ["Tyrosine", "41mg", "290mg"],
  ["Valine†", "316mg", "2260mg"],
];


const FAQS = [
  {
    q: "Why doesn't Collagen Glow Up contain vitamin C?",
    a: [
      "Our previous version of Collagen Glow Up included vitamin C and hyaluronic acid.",
      "However, we found that these ingredients negatively impacted the taste, dissolvability and effectiveness. That's why, in response to customer feedback and product testing, we updated our formulation last year.",
      "The current version features a higher-grade, triple-filtered collagen that's purer, cleaner, and more effective on its own.",
      "When vitamin C is combined with collagen in powdered form, it can cause unpleasant smells and changes in texture, breakdown of collagen proteins over time, reduced effectiveness due to exposure to moisture, oxygen, heat, and pH fluctuations.",
      "These issues are common when Vitamin C is mixed with powder unless special (and often expensive) stabilisation techniques are used—like microencapsulation or individual packaging. We prefer to keep things simple, honest, and effective.",
      "Vitamin C does not improve the absorption of collagen, but rather assists with your body's natural collagen formation. These are two separate biological processes, with absorption referring to how collagen peptides are taken up through your digestive system into your bloodstream, and formation referring to your body's natural process of making new collagen proteins, which vitamin C assists with.",
      "It's also important to stay well hydrated, as hydration plays a key role in how your body processes collagen.",
      "Does the product still work? Absolutely. We sell over 250,000 packs of Collagen Glow Up every month, and the results speak for themselves. Thousands of customers continue to see and feel the difference!",
    ],
  },
  {
    q: "Are there any side effects associated with taking collagen powder?",
    a: [
      "Collagen powder is a source of dietary protein and is generally well tolerated when consumed as part of a balanced diet. As with many protein-rich foods, some individuals may experience mild digestive discomfort, such as bloating or a feeling of fullness, particularly when first introducing it.",
      "If you have specific dietary requirements, allergies, or medical concerns, it's advisable to consult a healthcare professional before making changes to your diet.",
      "Our collagen protein powder contains no added artificial additives and is free from common allergens.",
    ],
  },
  {
    q: "Can you consume too much collagen?",
    a: [
      "Collagen powder is a source of dietary protein and should be consumed as part of a balanced diet. As with any protein-rich food, consuming it in very large amounts may lead to mild digestive discomfort, such as bloating or a feeling of fullness.",
      "It's best to follow the suggested serving guidance and incorporate collagen as part of your normal daily food and drink routine. If you have specific dietary requirements or health concerns, you may wish to consult a healthcare professional before making changes to your diet.",
    ],
  },
  {
    q: "Why We Use Type I and III Collagen",
    a: [
      "Our formulation combines Type I and Type III collagen, reflecting the natural composition found in the human body.",
      "Type I collagen constitutes approximately 90% of the body's total collagen content and forms the structural framework of skin, tendons, ligaments, and bones. This essential protein is a fundamental component of the skin's support structure.",
      "We've paired it with Type III collagen because in nature, these two types often work together in the same tissues. Type III collagen is found in skin, blood vessels, and organs.",
      "The Type I and III combination offers a comprehensive approach, providing the building blocks that contribute to the body's most abundant structural proteins, targeting multiple body systems simultaneously.",
    ],
  },
  {
    q: "Is Collagen Glow Up suitable for vegetarians or vegans?",
    a: [
      "No, Collagen Glow Up is not suitable for vegetarians or vegans. It contains hydrolysed collagen peptides sourced from bovine (cow) hides.",
      "Collagen peptides are derived from animal sources and are naturally present in connective tissues. This product provides Type I and Type III collagen, which are commonly found in the body.",
      "There are plant-based alternatives available, but these do not contain collagen, as collagen is not found in plant sources.",
    ],
  },
  {
    q: "How should I use collagen powder?",
    a: [
      "Add two flat tablespoons of collagen powder to food or drinks as part of your daily routine. It can be mixed into water, juice, smoothies, coffee or tea, and works well in both hot and cold options.",
      "Collagen Glow Up is virtually odourless and tasteless, making it easy to include in a variety of everyday meals and drinks.",
    ],
  },
  {
    q: "How does Collagen interact with other supplements/medications?",
    a: [
      "Collagen powder is a source of dietary protein and is generally suitable to include as part of a balanced diet. If you have any underlying health conditions or are taking prescribed medication, it's best to speak to a healthcare professional before making changes to your diet.",
    ],
  },
];

function TitleWithEmoji({ emoji, text }: { emoji: string; text: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true">{emoji}</span>
      {text}
    </span>
  );
}

function Stars({ className = "size-4" }: { className?: string }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} className={`${className} fill-current`} />
      ))}
    </span>
  );
}

function ProductPage() {
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState("1");
  

  const bundle = BUNDLES.find((b) => b.id === selected) ?? BUNDLES[0]!;

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      {/* Announcement bar */}
      <div className="bg-teal text-teal-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 text-[13px]">
          <div className="hidden items-center gap-4 md:flex">
            <a href="https://www.facebook.com/nutritiongeeksofficial/" aria-label="Facebook" target="_top" rel="external" className="opacity-90 hover:opacity-100">
              <svg viewBox="0 0 24 24" className="size-4 fill-current"><path d="M13.5 9H16V6h-2.5C11.6 6 10 7.6 10 9.5V11H8v3h2v7h3v-7h2.2l.3-3H13v-1.2c0-.5.2-.8.5-.8Z" /></svg>
            </a>
            <a href="https://www.instagram.com/nutritiongeeks/" aria-label="Instagram" target="_top" rel="external" className="opacity-90 hover:opacity-100">
              <svg viewBox="0 0 24 24" className="size-4 fill-current"><path d="M12 7.5A4.5 4.5 0 1 0 16.5 12A4.5 4.5 0 0 0 12 7.5m0 7.4A2.9 2.9 0 1 1 14.9 12A2.9 2.9 0 0 1 12 14.9M17 3H7a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4m2.4 14a2.4 2.4 0 0 1-2.4 2.4H7A2.4 2.4 0 0 1 4.6 17V7A2.4 2.4 0 0 1 7 4.6h10A2.4 2.4 0 0 1 19.4 7Zm-2-9.9a1 1 0 1 1-1-1a1 1 0 0 1 1 1" /></svg>
            </a>
            <a href="https://www.tiktok.com/@nutritiongeeksofficial" aria-label="TikTok" target="_top" rel="external" className="opacity-90 hover:opacity-100">
              <svg viewBox="0 0 24 24" className="size-4 fill-current"><path d="M16 3h-2.7v11.2a2.5 2.5 0 1 1-2-2.4V9.1a5 5 0 1 0 4.7 5V8.6A5.3 5.3 0 0 0 19.5 10V7.4A3.4 3.4 0 0 1 16 4.1Z" /></svg>
            </a>
          </div>
          <p className="flex-1 inline-flex items-center justify-center gap-2 text-center font-medium">
            <span aria-hidden="true">🎁</span>FREE Gift When You Spend £22+
          </p>
          <button className="hidden items-center gap-1 font-medium md:flex">
            <span className="sr-only">Country/region</span>(GBP £){" "}
            <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
          <a href="/" className="mx-auto">
            <img
              src={`${CDN}/Asset_5_5849ac1d-6dd2-4bb4-b9bb-62d76a21ee5d.svg?v=1719328855`}
              alt="Nutrition Geeks"
              className="h-9 w-auto md:h-12"
            />
          </a>
        </div>
      </header>

      <main className="pb-24 md:pb-0">
        {/* Product */}
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-8 md:py-14 lg:grid-cols-2 lg:gap-14">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-3xl bg-brand-soft">
              <img
                src={GALLERY[active]}
                alt="Collagen Glow Up Powder"
                className="aspect-square w-full object-contain"
              />
            </div>
            <div className="mt-4 flex gap-3">
              {GALLERY.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActive(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`overflow-hidden rounded-xl border-2 transition-colors ${
                    active === i ? "border-brand" : "border-transparent"
                  }`}
                >
                  <img src={src} alt="" className="size-16 object-contain md:size-20" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
              Collagen Glow Up Powder
            </h1>

            <div className="mt-4 flex items-center gap-2 text-sm">
              <Stars />
              <span className="font-medium">7475 reviews</span>
            </div>

            <p className="mt-5 flex items-center gap-2 font-semibold">
              <span aria-hidden="true">⏳</span>1 month supply (420g)
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              The all-natural, triple-filtered premium collagen powder delivering 12.6g of protein
              per serving.
            </p>

            <ul className="mt-5 space-y-2.5 text-[15px]">
              {[
                { emoji: "🥤", text: "Powder-based for easy mixing" },
                { emoji: "☕", text: "Dissolves effortlessly into hot drinks & food" },
                {
                  emoji: "✨",
                  text: "Support skin health with Biotin Growth+ (free with 3-month bundle)*",
                },
                { emoji: "👨‍🔬", text: "Triple-filtered for supreme purity and a neutral taste" },
              ].map(({ emoji, text }) => (
                <li key={text} className="flex items-start gap-2">
                  <span aria-hidden="true">{emoji}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-teal/40 bg-teal-soft px-4 py-3.5 text-[15px]">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal text-teal-foreground">
                <Gift className="size-4" />
              </span>
              <p>
                <span className="font-semibold text-teal">Free Magnesium Glycinate 3-in-1</span>{" "}
                when you spend £22+
              </p>
            </div>

            <div className="mt-6 flex items-end gap-4">
              <span className="text-4xl font-extrabold text-price">{bundle.price}</span>
              <span className="pb-1 text-sm text-muted-foreground">
                <s>{bundle.compare}</s>
                <br />
                you save £3.00
              </span>
            </div>

            <div className="my-7 flex items-center gap-4">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-bold tracking-widest">BUY MORE, SAVE MORE</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-4">
              {BUNDLES.map((b) => {
                const isSelected = selected === b.id;
                return (
                  <div key={b.id} className="relative">
                    {b.badge && (
                      <span className="absolute -top-3 right-4 z-10 inline-flex items-center gap-1.5 rounded-md bg-ink px-2 py-1 text-[11px] font-semibold text-background">
                        <Gift className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                        {b.badge}
                      </span>
                    )}
                    <button
                      onClick={() => setSelected(b.id)}
                      aria-pressed={isSelected}
                      className={`w-full overflow-hidden rounded-2xl border-2 text-left transition-colors ${
                        isSelected
                          ? "border-ink bg-brand-soft"
                          : "border-border bg-muted/40 hover:border-brand/40"
                      }`}
                    >
                      <div className="flex items-center gap-4 p-4">
                        <img src={b.image} alt={b.title} className="size-16 object-contain" />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-bold">{b.title}</span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                isSelected
                                  ? "bg-background/70 text-ink"
                                  : "bg-background text-muted-foreground"
                              }`}
                            >
                              {b.perPack}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{b.supply}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-extrabold">{b.price}</p>
                          <p className="text-sm text-muted-foreground line-through">{b.compare}</p>
                        </div>
                      </div>

                      {b.gifts.length > 0 && (
                        <div className="divide-y divide-background/15">
                          {b.gifts.map((g) => (
                            <div
                              key={g.label}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                                isSelected ? "bg-ink text-background" : "bg-muted text-ink"
                              }`}
                            >
                              <img src={g.image} alt="" className="size-8 object-contain" />
                              <span className="flex-1 font-semibold">{g.label}</span>
                              <span className="text-xs line-through opacity-70">{g.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/checkout"
                search={{ pack: bundle.id }}
                onClick={() =>
                  tiktokTrack("AddToCart", {
                    value: parseAmount(bundle.price),
                    contents: [
                      {
                        content_id: bundle.id,
                        content_name: bundle.productName ?? bundle.title,
                        content_type: "product",
                        quantity: bundle.quantity ?? 1,
                        price: parseAmount(bundle.price),
                      },
                    ],
                  })
                }
                className="flex-1 rounded-full bg-brand px-8 py-4 text-center text-base font-bold text-brand-foreground transition-opacity hover:opacity-90"
              >
                Buy Now
              </Link>
            </div>


            <div className="mt-8 divide-y divide-border border-y border-border">
              <AccordionItem
                title={
                  <TitleWithEmoji emoji="🧘‍♀️" text="Health Benefits of Collagen Glow Up Powder" />
                }
              >
                {BENEFITS.map((b) => (
                  <div key={b.title}>
                    <p className="font-semibold text-ink">
                      <span aria-hidden="true">{b.emoji}</span> {b.title}
                    </p>
                    <p className="mt-1">{b.body}</p>
                  </div>
                ))}
                <p className="text-xs">*Biotin Growth+ is a separate product.</p>
              </AccordionItem>
              <AccordionItem title={<TitleWithEmoji emoji="🔬" text="Our Geeky Formula" />}>
                {FORMULA.map((f) => (
                  <div key={f.title}>
                    <p className="font-semibold text-ink">
                      <span aria-hidden="true">{f.emoji}</span> {f.title}
                    </p>
                    <p className="mt-1">{f.body}</p>
                  </div>
                ))}
              </AccordionItem>
              <AccordionItem title={<TitleWithEmoji emoji="🍎" text="Nutritional Information" />}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-ink">
                        <th className="py-2 font-semibold">Per 14g</th>
                        <th className="py-2 font-semibold">Per serving</th>
                        <th className="py-2 font-semibold">Per 100g</th>
                      </tr>
                    </thead>
                    <tbody>
                      {NUTRITION.map(([a, b, c]) => (
                        <tr key={a} className="border-b border-border/60">
                          <td className="py-2">{a}</td>
                          <td className="py-2">{b}</td>
                          <td className="py-2">{c}</td>
                        </tr>
                      ))}
                      <tr className="border-b border-border text-ink">
                        <td className="py-2 font-semibold" colSpan={3}>
                          Amino Acid Profile
                        </td>
                      </tr>
                      {AMINO.map(([a, b, c]) => (
                        <tr key={a} className="border-b border-border/60">
                          <td className="py-2">{a}</td>
                          <td className="py-2">{b}</td>
                          <td className="py-2">{c}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  <span className="font-semibold text-ink">Ingredients:</span> Hydrolysed Bovine
                  Collagen Peptides. Not suitable for vegetarians or vegans.
                </p>
                <p className="text-xs">
                  * Nutrient Reference Value AKA Recommended Daily Intake
                  <br />
                  ** Nutrient Reference Value Not Established
                  <br />† Essential Amino Acids
                </p>
              </AccordionItem>
              <AccordionItem title={<TitleWithEmoji emoji="📋" text="Directions & Information" />}>
                <p>
                  <span className="font-semibold text-ink">Directions:</span> Add 2 flat tablespoons
                  (14g) to food or drinks once per day. Mix into hot drinks such as coffee, or add to
                  meals like porridge or smoothies.
                </p>
                <p>
                  <span className="font-semibold text-ink">Supply:</span> Each pack contains 420g (1
                  month supply) of Collagen Glow Up Powder. That's the equivalent to just £17.99 GBP
                  per month!
                </p>
              </AccordionItem>
              <AccordionItem title={<TitleWithEmoji emoji="📦" text="Shipping Information" />}>
                <p>
                  All UK orders qualify for free, tracked UK delivery. Delivery takes 1-2 days.
                </p>
                <p>
                  For orders from outside the UK will vary depending on your location. Please review
                  our delivery policy for full delivery details.
                </p>
              </AccordionItem>
            </div>
          </div>
        </section>

        {/* As featured in */}
        <section className="border-y border-border bg-secondary/50 py-10">
          <h2 className="mb-6 text-center text-xl font-extrabold md:text-2xl">As Featured In</h2>
          <Marquee />
        </section>

        {/* Comparison */}
        <section className="mx-auto max-w-5xl px-4 py-14 text-center">
          <h2 className="text-2xl font-extrabold md:text-3xl">
            Why are customers switching to Collagen Glow Up
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] text-muted-foreground">
            Discover why millions of customers are switching to Nutrition Geeks from other brands.
          </p>
          <img
            src={`${CDN}/Collagen_Pli_updated_green_5-COMPARISON_5-COMPARISON_5-COMPARISON_530ce688-13e7-463b-aa99-188a7f545e11.png?v=1729094934&width=1000`}
            alt="Collagen Glow Up compared with other collagen brands"
            loading="lazy"
            className="mx-auto mt-8 w-full max-w-3xl"
          />
        </section>

        {/* Reviews */}
        <Reviews />


        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-center text-2xl font-extrabold md:text-3xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-center text-[15px] text-muted-foreground">
            Common questions about Collagen Glow Up Powder
          </p>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <AccordionItem key={f.q} title={f.q} variant="card">
                {f.a.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </AccordionItem>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="font-semibold">Can't find the answer you're looking for?</p>
            <a href="#" className="mt-2 inline-block underline underline-offset-4">
              💬 Click here to ask us!
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-ink pb-28 pt-12 text-background md:pb-12">
        <div className="mx-auto max-w-7xl px-4">
          <h3 className="text-xl font-extrabold">Sign up for updates, offers and more!</h3>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-5 flex max-w-xl items-center rounded-full bg-background p-1"
          >
            <input
              type="email"
              required
              placeholder="Enter your email"
              aria-label="Email"
              className="min-w-0 flex-1 bg-transparent px-5 py-3 text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-brand px-6 py-3 font-bold text-brand-foreground"
            >
              Sign up
            </button>
          </form>

          <div className="mt-10 grid gap-10 md:grid-cols-3">
            <div>
              <h4 className="text-lg font-extrabold">Shop</h4>
              <ul className="mt-4 space-y-3 text-sm">
                {["Search", "Shop All Supplements", "Bundles", "Delivery", "Returns & Refunds"].map(
                  (l) => (
                    <li key={l}>
                      <a href="#" className="underline underline-offset-4 hover:opacity-80">
                        {l}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-extrabold">Company</h4>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  "Customer Reviews",
                  "About Nutrition Geeks",
                  "Contact",
                  "Terms & Conditions",
                  "Privacy Policy",
                  "Blog",
                  "Update on Third Party Testing",
                ].map((l) => (
                  <li key={l}>
                    <a href="#" className="underline underline-offset-4 hover:opacity-80">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-extrabold">Get In Touch</h4>
              <p className="mt-4 text-sm">customerservices@nutritiongeeks.co</p>
              <div className="mt-6 flex items-center gap-5">
                <a href="https://www.facebook.com/nutritiongeeksofficial/" aria-label="Facebook" target="_top" rel="external">
                  <Facebook className="h-6 w-6" strokeWidth={1.75} />
                </a>
                <a href="https://www.instagram.com/nutritiongeeks/" aria-label="Instagram" target="_top" rel="external">
                  <Instagram className="h-6 w-6" strokeWidth={1.75} />
                </a>
                <a href="https://www.tiktok.com/@nutritiongeeksofficial" aria-label="TikTok" target="_top" rel="external">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                    <path d="M16.5 2h-3v13.2a2.7 2.7 0 1 1-2-2.6V9.5a5.7 5.7 0 1 0 5 5.7V9.4a6.6 6.6 0 0 0 3.5 1V7.3a3.6 3.6 0 0 1-3.5-3.5V2z" />
                  </svg>
                </a>
              </div>
              <div className="mt-6 flex max-w-xs flex-wrap gap-2">
                {[
                  "American Express",
                  "Apple Pay",
                  "Diners Club",
                  "Discover",
                  "Google Pay",
                  "Maestro",
                  "Mastercard",
                  "PayPal",
                  "Shop Pay",
                  "Union Pay",
                  "Visa",
                ].map((p) => (
                  <span
                    key={p}
                    className="rounded-md bg-background px-2 py-1 text-[10px] font-bold tracking-tight text-foreground"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-background/20 pt-6 text-sm">
            <p className="opacity-90">
              Copyright © {new Date().getFullYear()}{" "}
              <a href="#" className="underline underline-offset-4">
                Nutrition Geeks
              </a>
              . Powered by{" "}
              <a href="#" className="underline underline-offset-4">
                Propero
              </a>
            </p>
            <button className="flex items-center gap-2 self-start">
              <span className="sr-only">Country/region</span>(GBP £) <ChevronDown className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </footer>


      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <p className="font-bold text-price">{bundle.price}</p>
            <p className="text-xs text-muted-foreground line-through">{bundle.compare}</p>
          </div>
          <Link
            to="/checkout"
            search={{ pack: bundle.id }}
            className="flex-1 rounded-full bg-brand px-6 py-3.5 text-center font-bold text-brand-foreground"
          >
            Buy Now
          </Link>
        </div>
      </div>
    </div>
  );
}
