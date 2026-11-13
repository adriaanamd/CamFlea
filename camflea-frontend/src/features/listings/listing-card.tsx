import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { formatListingPrice } from "@/features/browse/domain";
import { StatusPill } from "@/components/status-pill";

export function ListingCard({
  listing,
  seller,
}: {
  listing: Tables<"marketplace_listings">;
  seller?: string | undefined;
}) {
  const path = listing.photos[0];
  const [image, setImage] = useState<string | null>(
    path && /^https?:\/\//.test(path) ? path : null,
  );
  useEffect(() => {
    if (!path || /^https?:\/\//.test(path)) return;
    let active = true;
    void supabase.storage
      .from("camflea-listings")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (active) setImage(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [path]);
  const unavailable = listing.status !== "available" && listing.status !== "active";
  return (
    <article className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg focus-within:-translate-y-1 focus-within:shadow-lg">
      <Link
        to="/listing/$listingId"
        params={{ listingId: listing.id }}
        className="block rounded-2xl focus-visible:outline focus-visible:outline-2"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {image ? (
            <img
              src={image}
              alt={listing.title}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
                unavailable ? "opacity-70 grayscale-[40%]" : ""
              }`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No photo
            </div>
          )}
          {unavailable ? (
            <span className="absolute left-3 top-3">
              <StatusPill status={listing.status} />
            </span>
          ) : null}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 font-semibold leading-snug">{listing.title}</h3>
            <span className="shrink-0 font-semibold text-primary">
              {formatListingPrice(listing)}
            </span>
          </div>
          <p className="text-sm capitalize text-muted-foreground">
            {listing.condition}
            {unavailable ? "" : ` · ${listing.status}`}
          </p>
          <p className="truncate text-sm">{seller ?? "Campus student"}</p>
        </div>
      </Link>
    </article>
  );
}
