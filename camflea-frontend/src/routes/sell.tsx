import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ListingForm } from "@/features/listings/listing-form";
import {
  attachListingPhotos,
  createListing,
  deleteListing,
} from "@/features/listings/listing-actions";
import { CamFleaPageShell } from "@/components/camflea-page-shell";
import { supabase } from "@/integrations/supabase/client";
import type { ListingInput } from "@/lib/validation/listing";

function SellPage() {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(input: ListingInput, files: File[]) {
    setSaving(true);
    setError("");
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      window.location.assign("/auth");
      setSaving(false);
      return;
    }
    let listingId = "";
    const uploadedPaths: string[] = [];
    try {
      const created = await createListing({ data: { ...input, photos: [] } });
      listingId = created.id;
      for (const file of files) {
        const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
        const path = `${userId}/${listingId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("camflea-listings")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
      }
      if (uploadedPaths.length) {
        await attachListingPhotos({ data: { id: listingId, photos: uploadedPaths } });
      }
      window.location.assign("/");
    } catch {
      if (uploadedPaths.length) {
        await supabase.storage.from("camflea-listings").remove(uploadedPaths);
      }
      if (listingId) {
        await deleteListing({ data: { id: listingId } }).catch(() => undefined);
      }
      setError("Could not post your listing. Your details are still here; please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <CamFleaPageShell>
      <ListingForm onSave={save} saving={saving} />
      {error && (
        <p role="alert" className="mx-auto max-w-3xl px-4 pb-8">
          {error}
        </p>
      )}
    </CamFleaPageShell>
  );
}

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Post an item · CamFlea" },
      { name: "description", content: "List a campus item for sale on CamFlea." },
      { property: "og:title", content: "Post an item · CamFlea" },
      { property: "og:description", content: "Give your campus finds a new home." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SellPage,
});
