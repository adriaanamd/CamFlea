import { useEffect, useState } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { formatListingPrice } from "@/features/browse/domain";
import type { AdminListing } from "@/features/admin/admin-dashboard-data";
import { supabase } from "@/integrations/supabase/client";

export function AdminListingPreview({
  listing,
  onClose,
}: {
  listing: AdminListing | null;
  onClose: () => void;
}) {
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<(string | null)[]>([]);
  useEffect(() => {
    let active = true;
    setSelectedPhoto(0);
    if (!listing) {
      setPhotoUrls([]);
      return () => {
        active = false;
      };
    }
    void Promise.all(
      listing.photos.map(async (photo) => {
        if (/^https?:\/\//i.test(photo)) return photo;
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
  }, [listing]);
  const selectedPhotoUrl = photoUrls[selectedPhoto] ?? null;

  return (
    <Dialog open={listing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-modal="true" className="admin-listing-preview max-w-4xl">
        {listing ? (
          <>
            <DialogHeader>
              <DialogTitle>{listing.title}</DialogTitle>
              <DialogDescription>Listing preview</DialogDescription>
            </DialogHeader>
            <div className="admin-listing-preview-layout">
              <div className="admin-listing-preview-gallery">
                {selectedPhotoUrl ? (
                  <img
                    className="admin-listing-preview-main-image"
                    src={selectedPhotoUrl}
                    alt={`${listing.title} photo ${selectedPhoto + 1}`}
                  />
                ) : (
                  <div className="admin-listing-preview-placeholder">
                    {listing.photos.length > 0 ? "Loading photos…" : "No photos available"}
                  </div>
                )}
                {listing.photos.length > 0 ? (
                  <div className="admin-listing-preview-thumbnails">
                    {listing.photos.map((photo, index) => (
                      <button
                        key={photo}
                        type="button"
                        className="admin-listing-preview-thumbnail"
                        aria-label={`Show photo ${index + 1}`}
                        aria-pressed={selectedPhoto === index}
                        onClick={() => setSelectedPhoto(index)}
                      >
                        {photoUrls[index] ? (
                          <img src={photoUrls[index] ?? undefined} alt="" />
                        ) : (
                          <span aria-hidden="true">Loading</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="admin-listing-preview-details">
                <p>{listing.category}</p>
                <p>{listing.condition}</p>
                <p className="admin-listing-preview-price">{formatListingPrice(listing)}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  <StatusPill status={listing.status} label={listing.status} />
                </p>
                <div>
                  <h3>Description</h3>
                  <p>{listing.description}</p>
                </div>
                <p>
                  <strong>Meet-up place:</strong> {listing.meeting_place}
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" aria-label="Close listing preview">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
