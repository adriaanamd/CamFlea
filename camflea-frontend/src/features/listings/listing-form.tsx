import { useState, type FormEvent, type ReactNode } from "react";
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/domain/listings";
import { listingInputSchema, type ListingInput } from "@/lib/validation/listing";
import { MediaUploader } from "./media-uploader";

const PRICE_TYPES = [
  { value: "single", title: "One price", hint: "A fixed amount" },
  { value: "range", title: "Price range", hint: "Min and max" },
  { value: "hidden", title: "Discuss price", hint: "Agree in chat" },
] as const;

function Field({
  id,
  label,
  error,
  hint,
  counter,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string;
  counter?: string;
  children: ReactNode;
}) {
  return (
    <div className="field-wrap">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id}>{label}</label>
        {counter ? <span className="text-xs text-muted-foreground">{counter}</span> : null}
      </div>
      {children}
      {hint && !error ? (
        <span id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

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
  const set = (key: keyof ListingInput, value: unknown) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const { [key]: _removed, ...rest } = previous;
      return rest;
    });
  };
  const num = (value: string) => (value === "" ? null : Number(value));
  const invalid = (key: string) => (errors[key] ? true : undefined);
  const describedBy = (key: string, hint = false) =>
    errors[key] ? `${key}-error` : hint ? `${key}-hint` : undefined;

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = listingInputSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      if (!form.category) next["category"] = "Category is required.";
      if (form.priceType === "single" && form.price === null) next["price"] = "Price is required.";
      setErrors(next);
      const first = Object.keys(next)[0];
      if (first) document.getElementById(first)?.focus();
      return;
    }
    if (!form.category) {
      setErrors({ category: "Category is required." });
      document.getElementById("category")?.focus();
      return;
    }
    if (form.priceType === "single" && form.price === null) {
      setErrors({ price: "Price is required." });
      document.getElementById("price")?.focus();
      return;
    }
    setErrors({});
    void onSave(parsed.data, photoFiles);
  }
  return (
    <form onSubmit={submit} noValidate className="listing-form camflea-form-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">{initial ? "UPDATE YOUR POST" : "GIVE IT A SECOND LIFE"}</p>
          <h1 className="text-3xl font-semibold">{initial ? "Edit listing" : "Post an item"}</h1>
          <p className="text-muted-foreground">
            Share clear details so students know what you’re selling.
          </p>
        </div>
      </header>

      <section className="form-section" aria-labelledby="sell-photos">
        <h2 id="sell-photos" className="text-lg font-semibold">
          Photos
        </h2>
        <MediaUploader
          photos={form.photos}
          onChange={(photos) => set("photos", photos)}
          onFilesChange={setPhotoFiles}
          error={errors["photos"]}
        />
      </section>

      <section className="form-section" aria-labelledby="sell-details">
        <h2 id="sell-details" className="text-lg font-semibold">
          Details
        </h2>
        <div className="flex flex-col gap-4">
          <Field
            id="title"
            label="Item name"
            error={errors["title"]}
            counter={`${form.title.length}/120`}
          >
            <input
              id="title"
              aria-label="Item name"
              aria-invalid={invalid("title")}
              aria-describedby={describedBy("title")}
              placeholder="e.g. Scientific calculator, barely used"
              maxLength={120}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>
          <Field
            id="description"
            label="Description"
            error={errors["description"]}
            counter={`${form.description.length}/5000`}
            hint="Mention age, flaws, and what’s included."
          >
            <textarea
              id="description"
              aria-label="Description"
              aria-invalid={invalid("description")}
              aria-describedby={describedBy("description", true)}
              maxLength={5000}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <div className="form-row">
            <Field id="category" label="Category" error={errors["category"]}>
              <select
                id="category"
                aria-label="Category"
                aria-invalid={invalid("category")}
                aria-describedby={describedBy("category")}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                <option value="">Choose a category</option>
                {LISTING_CATEGORIES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field id="condition" label="Condition">
              <select
                id="condition"
                aria-label="Condition"
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
              >
                {LISTING_CONDITIONS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            id="meetingPlace"
            label="Meet-up place"
            error={errors["meetingPlace"]}
            hint="Pick a public spot on campus, like the library or canteen."
          >
            <input
              id="meetingPlace"
              aria-label="Meet-up place"
              aria-invalid={invalid("meetingPlace")}
              aria-describedby={describedBy("meetingPlace", true)}
              maxLength={160}
              value={form.meetingPlace}
              onChange={(e) => set("meetingPlace", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="form-section" aria-labelledby="sell-price">
        <fieldset>
          <legend id="sell-price" className="mb-3 text-lg font-semibold">
            Price
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {PRICE_TYPES.map(({ value, title, hint }) => (
              <label
                key={value}
                className={`cursor-pointer rounded-xl border-2 p-3 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 ${
                  form.priceType === value
                    ? "border-primary bg-accent"
                    : "border-border bg-white hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="priceType"
                  value={value}
                  className="sr-only"
                  checked={form.priceType === value}
                  onChange={() => set("priceType", value)}
                  aria-label={title}
                />
                <span className="block font-semibold">{title}</span>
                <span className="block text-xs font-normal text-muted-foreground">{hint}</span>
              </label>
            ))}
          </div>
          <div className="mt-4">
            {form.priceType === "single" && (
              <Field id="price" label="Price (PHP)" error={errors["price"]}>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    ₱
                  </span>
                  <input
                    id="price"
                    aria-label="Price (PHP)"
                    aria-invalid={invalid("price")}
                    aria-describedby={describedBy("price")}
                    className="w-full !pl-8"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={form.price ?? ""}
                    onChange={(e) => set("price", num(e.target.value))}
                  />
                </div>
              </Field>
            )}
            {form.priceType === "range" && (
              <div className="form-row">
                <Field id="priceMin" label="Minimum price" error={errors["priceMin"]}>
                  <input
                    id="priceMin"
                    aria-label="Minimum price"
                    aria-invalid={invalid("priceMin")}
                    aria-describedby={describedBy("priceMin")}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={form.priceMin ?? ""}
                    onChange={(e) => set("priceMin", num(e.target.value))}
                  />
                </Field>
                <Field id="priceMax" label="Maximum price" error={errors["priceMax"]}>
                  <input
                    id="priceMax"
                    aria-label="Maximum price"
                    aria-invalid={invalid("priceMax")}
                    aria-describedby={describedBy("priceMax")}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={form.priceMax ?? ""}
                    onChange={(e) => set("priceMax", num(e.target.value))}
                  />
                </Field>
                {errors["price"] && (
                  <p role="alert" className="col-span-full text-sm font-medium text-destructive">
                    {errors["price"]}
                  </p>
                )}
              </div>
            )}
            {form.priceType === "hidden" && (
              <p className="text-sm text-muted-foreground">
                Buyers will see “Discuss price” and can message you to agree on an amount.
              </p>
            )}
          </div>
        </fieldset>
      </section>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {Object.keys(errors).length
            ? "Please fix the highlighted fields."
            : "You can edit or remove your listing later."}
        </p>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : initial ? "Save changes" : "Post item"}
        </button>
      </div>
    </form>
  );
}
