import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusPill } from "@/components/status-pill";
import { formatListingPrice } from "@/features/browse/domain";
import type { AdminListing } from "@/features/admin/admin-dashboard-data";

export function AdminListingPreview({
  listing,
  onClose,
}: {
  listing: AdminListing | null;
  onClose: () => void;
}) {
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  useEffect(() => setSelectedPhoto(0), [listing?.id]);
  const selectedPhotoUrl = listing?.photos[selectedPhoto] ?? null;

  return (
    <Dialog open={listing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="admin-listing-preview max-w-4xl">
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
                  <div className="admin-listing-preview-placeholder">No photos available</div>
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
                        <img src={photo} alt="" />
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
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
