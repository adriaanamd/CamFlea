import { useState, type FormEvent } from "react";
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/domain/listings";
import { listingInputSchema, type ListingInput } from "@/lib/validation/listing";
import { MediaUploader } from "./media-uploader";
export function ListingForm({
  initial,
  onSave,
  saving = false,
}: {
  initial?: Partial<ListingInput>;
  onSave: (value: ListingInput, files: File[]) => void | Promise<void>;
  saving?: boolean;
}) {
  const [form, setForm] = useState<ListingInput>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? ("" as ListingInput["category"]),
    condition: initial?.condition ?? "Good",
    meetingPlace: initial?.meetingPlace ?? "",
    priceType: initial?.priceType ?? "single",
    price: initial?.price ?? null,
    priceMin: initial?.priceMin ?? null,
    priceMax: initial?.priceMax ?? null,
    photos: initial?.photos ?? [],
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (key: keyof ListingInput, value: unknown) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = listingInputSchema.safeParse(form);
    if (!parsed.success) {
      const next = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      if (!form.category) next["category"] = "Category is required.";
      if (form.priceType === "single" && form.price === null) next["price"] = "Price is required.";
      setErrors(next);
      return;
    }
    setErrors({});
    void onSave(parsed.data, photoFiles);
  }
  return (
    <form onSubmit={submit} className="listing-form camflea-form-page">
      <header className="page-heading">
        <h1 className="text-3xl font-semibold">{initial ? "Edit listing" : "Post an item"}</h1>
        <p className="text-muted-foreground">
          Share clear details so students know what you’re selling.
        </p>
      </header>
      <MediaUploader
        photos={form.photos}
        onChange={(photos) => set("photos", photos)}
        onFilesChange={setPhotoFiles}
        error={errors["photos"]}
      />
      <label className="block space-y-1">
        Item name
        <input
          aria-label="Item name"
          className="w-full rounded-xl border p-3"
          maxLength={120}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />
        {errors["title"] && <span role="alert">{errors["title"]}</span>}
      </label>
      <label className="block space-y-1">
        Description
        <textarea
          aria-label="Description"
          className="w-full rounded-xl border p-3"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
        {errors["description"] && <span role="alert">{errors["description"]}</span>}
      </label>
      <label className="block space-y-1">
        Category
        <select
          aria-label="Category"
          className="w-full rounded-xl border p-3"
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
        >
          <option value="">Choose a category</option>
          {LISTING_CATEGORIES.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        {errors["category"] && <span role="alert">{errors["category"]}</span>}
      </label>
      <label className="block space-y-1">
        Condition
        <select
          aria-label="Condition"
          className="w-full rounded-xl border p-3"
          value={form.condition}
          onChange={(e) => set("condition", e.target.value)}
        >
          {LISTING_CONDITIONS.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        Meet-up place
        <input
          aria-label="Meet-up place"
          className="w-full rounded-xl border p-3"
          value={form.meetingPlace}
          onChange={(e) => set("meetingPlace", e.target.value)}
        />
        {errors["meetingPlace"] && <span role="alert">{errors["meetingPlace"]}</span>}
      </label>
      <fieldset className="space-y-3">
        <legend className="font-medium">Price style</legend>
        {(["single", "range", "hidden"] as const).map((type) => (
          <label key={type} className="mr-4">
            <input
              type="radio"
              name="priceType"
              value={type}
              checked={form.priceType === type}
              onChange={() => set("priceType", type)}
            />{" "}
            {type === "single" ? "One price" : type === "range" ? "Price range" : "Discuss price"}
          </label>
        ))}
        {form.priceType === "single" && (
          <label className="block">
            Price (PHP)
            <input
              aria-label="Price (PHP)"
              type="number"
              min="0"
              step="0.01"
              value={form.price ?? ""}
              onChange={(e) => set("price", e.target.value === "" ? null : Number(e.target.value))}
            />
          </label>
        )}
        {form.priceType === "range" && (
          <div className="flex gap-3">
            <label>
              Minimum price
              <input
                aria-label="Minimum price"
                type="number"
                min="0"
                value={form.priceMin ?? ""}
                onChange={(e) =>
                  set("priceMin", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </label>
            <label>
              Maximum price
              <input
                aria-label="Maximum price"
                type="number"
                min="0"
                value={form.priceMax ?? ""}
                onChange={(e) =>
                  set("priceMax", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </label>
          </div>
        )}
      </fieldset>
      <button disabled={saving} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground">
        {saving ? "Saving…" : initial ? "Save changes" : "Post item"}
      </button>
    </form>
  );
}
