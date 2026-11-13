import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { filterAndSortListings, type BrowseListing, type BrowseOptions } from "./domain";
import { FilterRail } from "./filter-rail";
import { ListingCard } from "@/features/listings/listing-card";

type Listing = Tables<"marketplace_listings">;
export type BrowsePageData = {
  listings: Listing[];
  sellers: Record<string, { name: string; school?: string | null }>;
};
type BrowseProps = {
  listings?: (Listing & { seller?: string })[];
  loadListings?: () => Promise<BrowsePageData>;
  loading?: boolean;
  error?: string | null;
  stale?: boolean;
};

export function BrowsePage({
  listings: initialListings = [],
  loadListings,
  loading: initialLoading = false,
  error: initialError = null,
  stale = false,
}: BrowseProps) {
  const [listings, setListings] = useState<(Listing & { seller?: string })[]>(initialListings);
  const [sellers, setSellers] = useState<BrowsePageData["sellers"]>({});
  const [loading, setLoading] = useState(Boolean(loadListings) || initialLoading);
  const [error, setError] = useState<string | null>(initialError);
  useEffect(() => {
    if (initialListings.length) setListings(initialListings);
  }, [initialListings]);
  useEffect(() => {
    if (!loadListings) return;
    let active = true;
    void loadListings()
      .then((data) => {
        if (active) {
          setListings(data.listings);
          setSellers(data.sellers);
          setError(null);
        }
      })
      .catch(() => {
        if (active) setError("Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadListings]);
  const [options, setOptions] = useState<BrowseOptions>({
    query: "",
    category: "all",
    condition: "all",
    sort: "newest",
  });
  const results = useMemo(
    () => filterAndSortListings(listings as BrowseListing[], options),
    [listings, options],
  );
  return (
    <div className="browse-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">CAMPUS FINDS, SECOND LIFE</p>
          <h1>
            Find your next <em>good thing.</em>
          </h1>
          <p className="page-intro">Browse useful items listed by your campus community.</p>
        </div>
      </header>
      <div className="browse-search">
        <label htmlFor="browse-search-input">Search the campus marketplace</label>
        <div className="relative">
          <Search
            aria-hidden="true"
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="browse-search-input"
            aria-label="Search listings"
            type="search"
            role="searchbox"
            value={options.query}
            onChange={(event) => setOptions({ ...options, query: event.target.value })}
            placeholder="Search items, descriptions, or meet-up places"
            className="browse-search-input !pl-10 !pr-10"
          />
          {options.query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setOptions({ ...options, query: "" })}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-accent"
            >
              <X aria-hidden="true" size={16} />
            </button>
          )}
        </div>
      </div>
      <FilterRail
        category={options.category}
        condition={options.condition}
        sort={options.sort}
        availableOnly={Boolean(options.availableOnly)}
        onCategoryChange={(category) => setOptions({ ...options, category })}
        onConditionChange={(condition) => setOptions({ ...options, condition })}
        onSortChange={(sort) => setOptions({ ...options, sort })}
        onAvailableOnlyChange={(availableOnly) => setOptions({ ...options, availableOnly })}
        onReset={() =>
          setOptions({ ...options, category: "all", condition: "all", availableOnly: false })
        }
      />
      <div className="catalog-bar browse-catalog-bar">
        <div>
          <h2>
            {options.query.trim()
              ? `Results for “${options.query.trim()}”`
              : options.category !== "all"
                ? options.category
                : "Recently listed"}
          </h2>
          <span aria-live="polite">
            {results.length} {results.length === 1 ? "item" : "items"}
          </span>
        </div>
      </div>
      {stale && <p role="status">Showing saved results while refreshing.</p>}
      {loading ? (
        <div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          role="status"
          aria-busy="true"
        >
          <span className="sr-only">Loading listings…</span>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border bg-card" aria-hidden="true">
              <div className="aspect-[4/3] animate-pulse bg-muted" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-card p-6 text-center"
        >
          <p className="font-semibold">Could not load listings. {error}</p>
          <button
            type="button"
            className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : results.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing as Listing}
              seller={listing.seller_id ? sellers[listing.seller_id]?.name : undefined}
            />
          ))}
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed p-10 text-center">
          <h3 className="text-lg font-semibold">No listings match your search</h3>
          <p className="mt-2 text-muted-foreground">Try another search or clear your filters.</p>
          <button
            type="button"
            className="mt-4 rounded-full border px-4 py-2 text-sm font-semibold text-primary hover:bg-accent"
            onClick={() =>
              setOptions({ query: "", category: "all", condition: "all", sort: "newest" })
            }
          >
            Clear filters
          </button>
        </section>
      )}
    </div>
  );
}
