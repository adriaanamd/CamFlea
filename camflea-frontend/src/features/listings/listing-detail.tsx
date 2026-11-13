import { useEffect, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { formatListingPrice } from "@/features/browse/domain";
import { supabase } from "@/integrations/supabase/client";
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
    <main className="listing-detail-page">
      <section aria-label="Listing photos" className="space-y-3">
        <div className="aspect-square overflow-hidden rounded-3xl bg-muted">
          {selectedUrl ? (
            <img
              className="h-full w-full object-cover"
              src={selectedUrl}
              alt={`${listing.title} photo ${selected + 1}`}
            />
          ) : (
            <div className="flex h-full items-center justify-center">No photos available</div>
          )}
        </div>
        <div className="flex gap-2">
          {listing.photos.map((photo, index) => (
            <button
              key={photo}
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
              className="h-16 w-16 overflow-hidden rounded-xl border"
            >
              {photoUrls[index] ? (
                <img src={photoUrls[index] ?? undefined} alt="" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden="true" className="block h-full w-full bg-muted" />
              )}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-5">
        <p className="text-sm text-muted-foreground">{listing.category}</p>
        <h1 className="text-3xl font-semibold">{listing.title}</h1>
        <p className="text-2xl font-semibold">{formatListingPrice(listing)}</p>
        <p>
          {listing.condition} ·{" "}
          <span>
            {listing.status === "available" ? "Available" : `${listing.status} — unavailable`}
          </span>
        </p>
        <div>
          <h2 className="font-semibold">Description</h2>
          <p className="whitespace-pre-wrap text-muted-foreground">{listing.description}</p>
        </div>
        <p>
          <strong>Meet-up place:</strong> {listing.meeting_place}
        </p>
        <p>
          <strong>Seller:</strong> {seller}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={!available}
            onClick={onMessage}
            className="rounded-xl bg-primary px-4 py-2 text-primary-foreground"
          >
            Message seller
          </button>
          <button
            disabled={!available}
            onClick={onPurchase}
            className="rounded-xl border px-4 py-2"
          >
            Purchase
          </button>
          <button onClick={onReport} className="rounded-xl border px-4 py-2">
            Report listing
          </button>
        </div>
      </section>
    </main>
  );
}
