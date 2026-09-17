export type Review = {
  name: string;
  place?: string;
  date: string;
  rating: number;
  title: string;
  body: string;
  verified?: "verified" | "shop";
  note?: string;
};

export const REVIEWS: Review[] = [
  { name: "Lisa Prior", place: "Ringwood, GB", date: "20/07/26", rating: 5, verified: "verified", title: "Collagen", body: "Wow, what a fantastic product, I have been using this for a few months now and I can really see the difference. My skin is a lot firmer and my bags under my eyes have definitely shrunk." },
  { name: "Ali", date: "20/07/26", rating: 5, verified: "shop", title: "Fast delivery", body: "Fast delivery, love this and it does the job." },
  { name: "Anonymous", place: "Sheffield, GB", date: "20/07/26", rating: 5, verified: "verified", title: "Excellent powder", body: "Excellent powder, gives full benefits after 6 weeks." },
  { name: "Cheryl", date: "19/07/26", rating: 5, verified: "shop", title: "Delivered quickly", body: "Delivered quickly, exactly as described and easy to use every morning." },
  { name: "Avril New", place: "Ashby-de-la-Zouch, GB", date: "19/07/26", rating: 5, verified: "verified", title: "Great product", body: "I add a scoop to my morning coffee and it dissolves without any taste at all. Nails are stronger already." },
  { name: "Denise M.", place: "Cardiff, GB", date: "18/07/26", rating: 5, verified: "verified", title: "Hair growth", body: "After three months my hair is noticeably thicker and shinier. I won't be switching brands." },
  { name: "Anonymous", place: "Woking, GB", date: "18/07/26", rating: 1, verified: "verified", title: "New formula?", body: "Latest batch is not the same as previous. Taste revolting. Never tasted it before. Will sadly be looking elsewhere next time." },
  { name: "Nina", date: "17/07/26", rating: 1, verified: "shop", title: "It came flat", body: "It came flat", note: "Review written in Shop App" },
  { name: "Graham T.", place: "Leeds, GB", date: "17/07/26", rating: 5, verified: "verified", title: "Joints feel better", body: "I'm 62 and take it for my knees. Six weeks in and the morning stiffness has really eased off." },
  { name: "Sophie R.", place: "Brighton, GB", date: "16/07/26", rating: 4, verified: "verified", title: "Good value", body: "Good value for the amount of protein per serving. Mixes best in something warm." },
  { name: "Karen H.", place: "Glasgow, GB", date: "16/07/26", rating: 5, verified: "verified", title: "Skin glow is real", body: "My colleagues asked what I changed about my skincare. It's just this in my tea every morning!" },
  { name: "Paul", date: "15/07/26", rating: 5, verified: "shop", title: "Repeat customer", body: "Third order. Consistent quality and the bundle price is hard to beat." },
  { name: "Amira K.", place: "Manchester, GB", date: "15/07/26", rating: 5, verified: "verified", title: "No aftertaste", body: "Tried two other collagens before and both were gritty. This one is completely smooth." },
  { name: "Helen B.", place: "Norwich, GB", date: "14/07/26", rating: 5, verified: "verified", title: "Nails stopped splitting", body: "My nails used to peel constantly. Two months on and they're finally growing long." },
  { name: "Marcus L.", place: "Bristol, GB", date: "14/07/26", rating: 4, verified: "verified", title: "Solid protein hit", body: "Use it post gym alongside my usual shake. 12.6g of protein for the price is fair." },
  { name: "Anonymous", place: "Dundee, GB", date: "13/07/26", rating: 3, verified: "verified", title: "Takes patience", body: "Nothing for the first month, then a difference in my hair. Give it time." },
  { name: "Ruth", date: "13/07/26", rating: 5, verified: "shop", title: "Lovely", body: "Lovely product, quick postage and nicely packaged." },
  { name: "Fiona McB.", place: "Aberdeen, GB", date: "12/07/26", rating: 5, verified: "verified", title: "Bought for my mum", body: "Bought it for my mum's joints and ended up ordering a second bag for myself." },
  { name: "Tanya P.", place: "Nottingham, GB", date: "12/07/26", rating: 5, verified: "verified", title: "Free gift was a bonus", body: "Ordered the 3 pack and got the biotin free. Great little bonus, and the biotin pairs well with it." },
  { name: "Dan W.", place: "Sheffield, GB", date: "11/07/26", rating: 5, verified: "verified", title: "Easy routine", body: "Zero effort to take. One scoop in coffee and I forget it's even there." },
  { name: "Priya S.", place: "Leicester, GB", date: "11/07/26", rating: 5, verified: "verified", title: "Best I've tried", body: "I've gone through five different collagen brands over the years. This dissolves better than all of them." },
  { name: "Anonymous", place: "Plymouth, GB", date: "10/07/26", rating: 2, verified: "verified", title: "Scoop missing", body: "Product seems fine but there was no scoop in my bag, so I had to guess the serving." },
  { name: "Claire E.", place: "York, GB", date: "10/07/26", rating: 5, verified: "verified", title: "Skin texture", body: "Fine lines around my eyes look softer. I'm 47 and genuinely pleased." },
  { name: "Steve", date: "09/07/26", rating: 5, verified: "shop", title: "Quick and easy", body: "Quick and easy ordering, arrived next day." },
  { name: "Nadia F.", place: "London, GB", date: "09/07/26", rating: 5, verified: "verified", title: "Great in porridge", body: "Stir it into my porridge, can't taste a thing. Perfect for fussy people like me." },
  { name: "Robert G.", place: "Swansea, GB", date: "08/07/26", rating: 4, verified: "verified", title: "Does the job", body: "Not a miracle but my hair is shedding less and that's what I wanted." },
  { name: "Emma J.", place: "Chester, GB", date: "08/07/26", rating: 5, verified: "verified", title: "Recommended by a friend", body: "A friend swore by it so I tried it. Now I'm the one recommending it." },
  { name: "Anonymous", place: "Hull, GB", date: "07/07/26", rating: 5, verified: "verified", title: "No bloating", body: "Other protein powders bloat me. This one doesn't at all." },
  { name: "Yvonne C.", place: "Belfast, GB", date: "07/07/26", rating: 5, verified: "verified", title: "Six weeks in", body: "Six weeks and my nails, hair and skin all improved. Ordering the 6 pack next time." },
  { name: "Liam O.", place: "Reading, GB", date: "06/07/26", rating: 5, verified: "verified", title: "Good clean formula", body: "No sweeteners, no fillers, just collagen. Exactly what I was looking for." },
  { name: "Bethany", date: "06/07/26", rating: 4, verified: "shop", title: "Happy with it", body: "Happy with it overall, would prefer a resealable zip that's a bit sturdier." },
  { name: "Margaret D.", place: "Inverness, GB", date: "05/07/26", rating: 5, verified: "verified", title: "70 and glowing", body: "I'm 70 and my skin hasn't looked this good in years. Wonderful stuff." },
  { name: "Chris N.", place: "Coventry, GB", date: "05/07/26", rating: 5, verified: "verified", title: "Subscription worth it", body: "Set up a repeat order so I never run out. Saves a few pounds too." },
  { name: "Anonymous", place: "Milton Keynes, GB", date: "04/07/26", rating: 3, verified: "verified", title: "Mixed feelings", body: "Skin improved but I did not notice anything for my joints. Still finishing the bag." },
  { name: "Simone T.", place: "Bath, GB", date: "04/07/26", rating: 5, verified: "verified", title: "Love the routine", body: "It's become part of my morning ritual. Coffee, collagen, out the door." },
  { name: "Adam H.", place: "Newcastle, GB", date: "03/07/26", rating: 5, verified: "verified", title: "Gym recovery", body: "Recovery between sessions feels quicker. Great alongside training." },
  { name: "Julie", date: "03/07/26", rating: 5, verified: "shop", title: "Arrived early", body: "Arrived a day early, well packaged and sealed." },
  { name: "Rachel V.", place: "Ipswich, GB", date: "02/07/26", rating: 5, verified: "verified", title: "Hair regrowth", body: "Little baby hairs coming through at my hairline after postpartum shedding. So pleased." },
  { name: "Tom B.", place: "Derby, GB", date: "02/07/26", rating: 4, verified: "verified", title: "Good but pricey solo", body: "Buy the multi pack, the single bag works out expensive." },
  { name: "Anonymous", place: "Exeter, GB", date: "01/07/26", rating: 5, verified: "verified", title: "Triple filtered difference", body: "You can tell it's properly filtered, there's no fishy or meaty smell whatsoever." },
  { name: "Grace L.", place: "Oxford, GB", date: "01/07/26", rating: 5, verified: "verified", title: "Bridal prep", body: "Started three months before my wedding. Skin looked incredible in the photos." },
  { name: "Peter A.", place: "Luton, GB", date: "30/06/26", rating: 5, verified: "verified", title: "Knees", body: "Cycling is more comfortable now. Genuinely surprised." },
  { name: "Hannah", date: "30/06/26", rating: 5, verified: "shop", title: "Great service", body: "Great service and a lovely free gift with my order." },
  { name: "Debbie R.", place: "Southampton, GB", date: "29/06/26", rating: 5, verified: "verified", title: "Smoothies", body: "Blends into smoothies perfectly, no clumps at all." },
  { name: "Alan K.", place: "Preston, GB", date: "29/06/26", rating: 4, verified: "verified", title: "Doing well", body: "Two bags in, nails are stronger. Hair too early to say." },
  { name: "Anonymous", place: "Stoke-on-Trent, GB", date: "28/06/26", rating: 2, verified: "verified", title: "Not for me", body: "Product quality seems good but I couldn't get on with taking it daily." },
  { name: "Sarah-Jane W.", place: "Truro, GB", date: "28/06/26", rating: 5, verified: "verified", title: "Cellulite", body: "Skin on my thighs looks smoother. Not perfect but a visible improvement." },
  { name: "Mohammed I.", place: "Birmingham, GB", date: "27/06/26", rating: 5, verified: "verified", title: "Excellent quality", body: "Clear labelling, honest ingredients list, and it works. Nothing more to ask." },
  { name: "Kirsty", date: "27/06/26", rating: 5, verified: "shop", title: "Will reorder", body: "Will definitely reorder, my skin is loving it." },
  { name: "Elaine P.", place: "Carlisle, GB", date: "26/06/26", rating: 5, verified: "verified", title: "Menopause support", body: "Started during menopause for hair thinning. Shedding has reduced a lot." },
  { name: "Neil S.", place: "Wolverhampton, GB", date: "26/06/26", rating: 5, verified: "verified", title: "Good protein source", body: "Handy way to add protein without another shake to wash up." },
  { name: "Anonymous", place: "Blackpool, GB", date: "25/06/26", rating: 5, verified: "verified", title: "Dissolves instantly", body: "Dissolves instantly in hot water, no stirring needed really." },
  { name: "Louise M.", place: "Wakefield, GB", date: "25/06/26", rating: 5, verified: "verified", title: "Whole family", body: "My husband and I both take it now. Ordering the 6 pack from here on." },
  { name: "Victoria B.", place: "Guildford, GB", date: "24/06/26", rating: 5, verified: "verified", title: "Worth every penny", body: "Tried a well known premium brand at twice the price and this is better." },
  { name: "Gary", date: "24/06/26", rating: 4, verified: "shop", title: "Good stuff", body: "Good stuff, delivery was a couple of days later than expected." },
  { name: "Aisha N.", place: "Slough, GB", date: "23/06/26", rating: 5, verified: "verified", title: "Skin barrier", body: "My skin copes much better with cold weather now. Less dryness overall." },
  { name: "Ian F.", place: "Warrington, GB", date: "23/06/26", rating: 5, verified: "verified", title: "Simple and effective", body: "No nonsense product. Does exactly what it says." },
  { name: "Anonymous", place: "Bournemouth, GB", date: "22/06/26", rating: 4, verified: "verified", title: "Pleased", body: "Pleased with results so far, hair feels stronger at the ends." },
  { name: "Carol T.", place: "Peterborough, GB", date: "22/06/26", rating: 5, verified: "verified", title: "Second order", body: "Second order already. My nails have never been this healthy." },
  { name: "Zoe D.", place: "Colchester, GB", date: "21/06/26", rating: 5, verified: "verified", title: "Great with hot chocolate", body: "I put it in hot chocolate at night, completely undetectable." },
  { name: "Frank H.", place: "Doncaster, GB", date: "21/06/26", rating: 5, verified: "verified", title: "Shoulder mobility", body: "Old rugby injury feels easier day to day since starting." },
  { name: "Melanie", date: "20/06/26", rating: 5, verified: "shop", title: "Fantastic", body: "Fantastic product and quick, tidy delivery." },
  { name: "Charlotte A.", place: "Salisbury, GB", date: "20/06/26", rating: 5, verified: "verified", title: "Glowing", body: "Three friends have now ordered after seeing my skin. That says it all." },
  { name: "Anonymous", place: "Wigan, GB", date: "19/06/26", rating: 3, verified: "verified", title: "Okay", body: "Okay product, I just expected faster results from the reviews." },
  { name: "Owen J.", place: "Wrexham, GB", date: "19/06/26", rating: 5, verified: "verified", title: "Great for over 50s", body: "Energy and joints both better. Wish I'd found it sooner." },
  { name: "Bethan L.", place: "Swindon, GB", date: "18/06/26", rating: 5, verified: "verified", title: "Highly recommend", body: "Highly recommend to anyone on the fence. Just give it eight weeks." },
];

export const REVIEW_TOTAL = "7,475";
export const REVIEW_AVERAGE = 4.6;

const CDN = "https://www.nutritiongeeks.co/cdn/shop/files";

export type ReviewProduct = { name: string; image: string };

/** Produtos disponíveis no site — usados para variar o item avaliado em cada review. */
export const REVIEW_PRODUCTS: ReviewProduct[] = [
  {
    name: "Collagen Glow Up Powder",
    image: `${CDN}/collagen-glow-up-powder-nutrition-geeks-image-position-3_9167bbb8.png?v=1779640309&width=80`,
  },
  { name: "Collagen Glow Up Powder — 3 Packs", image: `${CDN}/3_pack_1.png?v=1775710196&width=80` },
  { name: "Collagen Glow Up Powder — 6 Packs", image: `${CDN}/6_pack_1.png?v=1775710196&width=80` },
  {
    name: "Biotin Growth+",
    image: `${CDN}/biotin-growth-nutrition-geeks-image-position_c7b0fb03.png?v=1778516594&width=80`,
  },
  {
    name: "Magnesium Glycinate 3-in-1",
    image: `${CDN}/magnesium-glycinate-3-in-1-nutrition-geeks-image-position_dbd9aad3.png?v=1753719782&width=80`,
  },
];

/** Produto estável por avaliação (mesma review sempre mostra o mesmo produto). */
export function productForReview(r: Review): ReviewProduct {
  const key = r.name + r.date + r.title;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 100000;
  const weighted = [0, 0, 1, 1, 2, 2, 0, 3, 4, 1];
  const index = weighted[hash % weighted.length] ?? 0;
  return REVIEW_PRODUCTS[index] ?? REVIEW_PRODUCTS[0]!;
}
