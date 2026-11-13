import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, UserRound } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { formatListingPrice } from "@/features/browse/domain";
import { supabase } from "@/integrations/supabase/client";
import { StatusPill } from "@/components/status-pill";
export function ListingDetail({
  listing,
  seller = "Campus student",
  onMessage,
  onPurchase,
  onReport,
}: {
  listing: Tables<"marketplace_listings">;
  seller?: string;
  onMessage?: () => void;
  onPurchase?: () => void;
  onReport?: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<(string | null)[]>([]);
  useEffect(() => {
    let active = true;
    setSelected(0);
    void Promise.all(
      listing.photos.map(async (photo) => {
        if (/^https?:\/\//.test(photo)) return photo;
        const { data } = await supabase.storage
          .from("camflea-listings")
          .createSignedUrl(photo, 3600);
        return data?.signedUrl ?? null;
      }),
    ).then((urls) => {
      if (active) setPhotoUrls(urls);
    });
    return () => {
      active = false;
    };
  }, [listing.photos]);
  const selectedUrl = photoUrls[selected] ?? null;
  const available = listing.status === "available";
  return (
    <div className="listing-detail-page">
      <section aria-label="Listing photos" className="space-y-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to browse
        </Link>
        <div className="aspect-square overflow-hidden rounded-3xl bg-muted">
          {selectedUrl ? (
            <img
              className="h-full w-full object-cover"
              src={selectedUrl}
              alt={`${listing.title} photo ${selected + 1}`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No photos available
            </div>
          )}
        </div>
        {listing.photos.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {listing.photos.map((photo, index) => (
              <button
                key={photo}
                type="button"
                aria-label={`Show photo ${index + 1}`}
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
                className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition ${
                  selected === index
                    ? "border-primary"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {photoUrls[index] ? (
                  <img
                    src={photoUrls[index] ?? undefined}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span aria-hidden="true" className="block h-full w-full bg-muted" />
                )}
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-5">
        <p className="text-sm capitalize text-muted-foreground">{listing.category}</p>
        <h1 className="text-3xl font-semibold">{listing.title}</h1>
        <p className="text-2xl font-semibold text-primary">{formatListingPrice(listing)}</p>
        <p className="flex flex-wrap items-center gap-2">
          <span className="capitalize">{listing.condition}</span>
          <span aria-hidden="true">·</span>
          <StatusPill
            status={listing.status}
            label={available ? "Available" : `${listing.status} — unavailable`}
          />
        </p>
        <div>
          <h2 className="font-semibold">Description</h2>
          <p className="whitespace-pre-wrap text-muted-foreground">{listing.description}</p>
        </div>
        <p className="flex items-center gap-2">
          <MapPin size={16} aria-hidden="true" className="text-primary" />
          <span>
            <strong>Meet-up place:</strong> {listing.meeting_place}
          </span>
        </p>
        <p className="flex items-center gap-2">
          <UserRound size={16} aria-hidden="true" className="text-primary" />
          <span>
            <strong>Seller:</strong> {seller}
          </span>
        </p>
        {!available && (
          <p role="note" className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            This item is no longer available, so messaging and purchase are disabled.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!available}
            onClick={onMessage}
            className="rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Message seller
          </button>
          <button
            type="button"
            disabled={!available}
            onClick={onPurchase}
            className="rounded-xl border px-4 py-2 font-semibold transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Purchase
          </button>
          <button
            type="button"
            onClick={onReport}
            className="rounded-xl border px-4 py-2 transition hover:bg-accent"
          >
            Report listing
          </button>
        </div>
      </section>
    </div>
  );
}
