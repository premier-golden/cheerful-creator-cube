import { useMemo, useState } from "react";
import {
  Star,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  REVIEWS,
  REVIEW_AVERAGE,
  REVIEW_TOTAL,
  productForReview,
  type Review,
} from "@/lib/reviews-data";

const PER_PAGE = 6;

type Sort = "recent" | "highest" | "lowest";

function RatingStars({ value, className = "size-4" }: { value: number; className?: string }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          strokeWidth={1.75}
          className={`${className} ${i <= value ? "fill-current" : "fill-transparent"}`}
        />
      ))}
    </span>
  );
}

function ReviewRow({ r }: { r: Review }) {
  const product = productForReview(r);
  return (
    <article className="border-t border-border py-7">
      <RatingStars value={r.rating} className="size-5" />
      <div className="mt-3 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold">
          {r.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
            {r.name}
            {r.verified === "verified" && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                Verified
              </span>
            )}
            {r.verified === "shop" && (
              <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                <BadgeCheck strokeWidth={1.75} className="size-3 text-teal" /> Verified by shop
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {r.place ? `${r.place} • ${r.date}` : r.date}
          </p>
        </div>
      </div>
      <h3 className="mt-4 text-lg font-extrabold">{r.title}</h3>
      <p className="mt-1 text-[15px] leading-relaxed text-foreground/80">{r.body}</p>
      {r.note && <p className="mt-2 text-sm text-muted-foreground">{r.note}</p>}
      <div className="mt-4 flex items-center gap-3 rounded-lg bg-secondary/70 p-3">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="size-9 rounded object-contain"
        />
        <div className="text-sm">
          <p className="text-muted-foreground">Review for</p>
          <a href="#top" className="font-medium underline">
            {product.name}
          </a>
        </div>
      </div>
    </article>
  );
}

export function Reviews() {
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>("recent");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = REVIEWS.filter((r) => {
      const matchesQuery =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q);
      return matchesQuery && (rating === null || r.rating === rating);
    });
    if (sort === "highest") list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === "lowest") list = [...list].sort((a, b) => a.rating - b.rating);
    return list;
  }, [query, rating, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const hasFilters = query !== "" || rating !== null || sort !== "recent";

  const pageNumbers = useMemo(() => {
    const list: (number | "…")[] = [];
    for (let i = 1; i <= pages; i++) {
      if (i <= 4 || i === pages || Math.abs(i - current) <= 1) list.push(i);
      else if (list[list.length - 1] !== "…") list.push("…");
    }
    return list;
  }, [pages, current]);

  const iconBtn =
    "grid size-10 place-items-center rounded-md border border-ink text-ink transition hover:bg-ink hover:text-primary-foreground";

  return (
    <section className="border-t border-border py-14">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">Customer Reviews</h2>
            <div className="mt-3 flex items-center gap-3">
              <Star strokeWidth={1.75} className="size-6 fill-amber-400 text-amber-400" />
              <span className="text-3xl font-extrabold">{REVIEW_AVERAGE}</span>
              <span className="text-sm text-muted-foreground">{REVIEW_TOTAL} reviews</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded-md bg-ink px-6 py-2.5 text-sm font-bold text-primary-foreground">
              Write a review
            </button>
            <button
              aria-label="Search reviews"
              onClick={() => setShowSearch((v) => !v)}
              className={iconBtn}
            >
              <Search strokeWidth={1.75} className="size-4" />
            </button>
            <button
              aria-label="Filter reviews"
              onClick={() => setShowFilters((v) => !v)}
              className={iconBtn}
            >
              <SlidersHorizontal strokeWidth={1.75} className="size-4" />
            </button>
            <button
              aria-label="Sort reviews"
              onClick={() => setShowSort((v) => !v)}
              className={iconBtn}
            >
              <ArrowUpDown strokeWidth={1.75} className="size-4" />
            </button>
          </div>
        </div>

        {showSearch && (
          <label className="mt-6 flex items-center gap-2 rounded-md border border-border px-4 py-3">
            <Search strokeWidth={1.75} className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        )}

        {showSort && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold">Sort by</span>
            {(
              [
                ["recent", "Most recent"],
                ["highest", "Highest rating"],
                ["lowest", "Lowest rating"],
              ] as [Sort, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setSort(key);
                  setPage(1);
                }}
                className={`rounded-full border px-4 py-1.5 font-medium transition ${
                  sort === key ? "border-ink bg-ink text-primary-foreground" : "border-border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {(showFilters || hasFilters) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold">Filters</span>
            {[5, 4, 3, 2, 1].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setRating(rating === n ? null : n);
                  setPage(1);
                }}
                className={`flex items-center gap-1 rounded-full border px-3 py-1.5 font-medium transition ${
                  rating === n ? "border-ink bg-ink text-primary-foreground" : "border-border"
                }`}
              >
                {n}
                <Star
                  strokeWidth={1.75}
                  className={`size-3.5 ${rating === n ? "fill-current" : "fill-amber-400 text-amber-400"}`}
                />
              </button>
            ))}
            <button
              onClick={() => {
                setQuery("");
                setRating(null);
                setSort("recent");
                setPage(1);
              }}
              className="rounded-full border border-border px-4 py-1.5 font-medium"
            >
              Clear filters
            </button>
          </div>
        )}

        <div className="mt-8">
          {visible.length === 0 ? (
            <p className="border-t border-border py-10 text-center text-sm text-muted-foreground">
              No reviews match your filters.
            </p>
          ) : (
            visible.map((r) => <ReviewRow key={r.name + r.date + r.title} r={r} />)
          )}
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-border pt-6">
          <button
            aria-label="Previous page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
            className="grid size-9 place-items-center rounded-full text-muted-foreground disabled:opacity-40"
          >
            <ChevronLeft strokeWidth={1.75} className="size-4" />
          </button>
          {pageNumbers.map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`grid size-9 place-items-center rounded-full text-sm font-medium transition ${
                  p === current ? "bg-ink text-primary-foreground" : "hover:bg-secondary"
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            aria-label="Next page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
            className="grid size-9 place-items-center rounded-full text-muted-foreground disabled:opacity-40"
          >
            <ChevronRight strokeWidth={1.75} className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
