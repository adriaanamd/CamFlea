import { useState } from "react";
const MAX_BYTES = 5 * 1024 * 1024;
export function MediaUploader({
  photos,
  onChange,
  error,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  error?: string | undefined;
}) {
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="listing-photos">
        Photos (up to 5)
      </label>
      <input
        id="listing-photos"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (photos.length + files.length > 5) {
            setMessage("You can add up to five photos.");
            return;
          }
          const invalid = files.find(
            (file) =>
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > MAX_BYTES,
          );
          if (invalid) {
            setMessage("Choose JPEG, PNG, or WebP images under 5 MB each.");
            return;
          }
          setMessage("");
          onChange([...photos, ...files.map((file) => URL.createObjectURL(file))]);
        }}
      />
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, index) => (
          <div className="relative h-16 w-16" key={`${photo}-${index}`}>
            <img
              className="h-full w-full rounded object-cover"
              src={photo}
              alt={`Selected photo ${index + 1}`}
            />
            <button
              type="button"
              aria-label={`Remove photo ${index + 1}`}
              className="absolute -right-1 -top-1 rounded-full bg-background px-1"
              onClick={() => onChange(photos.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {(message || error) && <p role="alert">{message || error}</p>}
    </div>
  );
}
