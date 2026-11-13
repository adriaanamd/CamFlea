import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ListingForm } from "@/features/listings/listing-form";
import { createListing } from "@/features/listings/listing-actions";
import type { ListingInput } from "@/lib/validation/listing";

function SellPage() {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(input: ListingInput) {
    setSaving(true);
    setError("");
    try {
      await createListing({ data: input });
      window.location.assign("/");
    } catch {
      setError("Could not post your listing. Your details are still here; please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <ListingForm onSave={save} saving={saving} />
      {error && (
        <p role="alert" className="mx-auto max-w-3xl px-4 pb-8">
          {error}
        </p>
      )}
    </>
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
