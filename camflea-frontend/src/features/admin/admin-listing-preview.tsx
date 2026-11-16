import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
          <DialogHeader>
            <DialogTitle>{listing.title}</DialogTitle>
            <DialogDescription>Listing preview</DialogDescription>
          </DialogHeader>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
