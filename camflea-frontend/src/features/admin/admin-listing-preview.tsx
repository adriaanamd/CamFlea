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
  return (
    <Dialog open={listing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="admin-listing-preview max-w-4xl">
        {listing ? (
          <>
            <DialogHeader>
              <DialogTitle>{listing.title}</DialogTitle>
              <DialogDescription>Listing preview</DialogDescription>
            </DialogHeader>
            <div className="admin-listing-preview-details">
              <p>{listing.category}</p>
              <p>{listing.condition}</p>
              <p className="admin-listing-preview-price">{formatListingPrice(listing)}</p>
              <p>
                <strong>Status:</strong> <StatusPill status={listing.status} label={listing.status} />
              </p>
              <div>
                <h3>Description</h3>
                <p>{listing.description}</p>
              </div>
              <p>
                <strong>Meet-up place:</strong> {listing.meeting_place}
              </p>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
