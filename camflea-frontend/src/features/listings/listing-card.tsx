import type { Tables } from "@/integrations/supabase/types";
import { formatListingPrice } from "@/features/browse/domain";
export function ListingCard({
  listing,
  seller,
}: {
  listing: Tables<"marketplace_listings">;
  seller?: string | undefined;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <a
        href={`/listing/${listing.id}`}
        className="block focus-visible:outline focus-visible:outline-2"
      >
        <div className="aspect-[4/3] bg-muted">
          {listing.photos[0] ? (
            <img
              src={listing.photos[0]}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No photo
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex justify-between gap-3">
            <h3 className="font-semibold">{listing.title}</h3>
            <span className="shrink-0 font-semibold">{formatListingPrice(listing)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {listing.condition} · {listing.status}
          </p>
          <p className="text-sm">{seller ?? "Campus student"}</p>
        </div>
      </a>
    </article>
  );
}
