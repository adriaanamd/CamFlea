import { useEffect, useMemo, useState } from "react";
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
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-primary">CamFlea campus marketplace</p>
        <h1 className="text-4xl font-semibold tracking-tight">Find your next campus find</h1>
        <p className="text-muted-foreground">Browse items listed by your campus community.</p>
      </header>
      <label className="block max-w-2xl space-y-2">
        <span className="text-sm font-medium">Search</span>
        <input
          aria-label="Search listings"
          type="search"
          role="searchbox"
          value={options.query}
          onChange={(event) => setOptions({ ...options, query: event.target.value })}
          placeholder="Search items, descriptions, or meet-up places"
          className="h-11 w-full rounded-xl border bg-background px-4"
        />
      </label>
      <FilterRail
        category={options.category}
        condition={options.condition}
        sort={options.sort}
        onCategoryChange={(category) => setOptions({ ...options, category })}
        onConditionChange={(condition) => setOptions({ ...options, condition })}
        onSortChange={(sort) => setOptions({ ...options, sort })}
        onReset={() => setOptions({ ...options, category: "all", condition: "all" })}
      />
      <h2 className="text-xl font-semibold">Browse listings</h2>
      {stale && <p role="status">Showing saved results while refreshing.</p>}
      {loading ? (
        <p role="status">Loading listings…</p>
      ) : error ? (
        <p role="alert">Could not load listings. {error}</p>
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
            className="mt-4 underline"
            onClick={() =>
              setOptions({ query: "", category: "all", condition: "all", sort: "newest" })
            }
          >
            Clear filters
          </button>
        </section>
      )}
    </main>
  );
}
