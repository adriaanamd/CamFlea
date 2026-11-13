import { useState } from "react";
const MAX_BYTES = 5 * 1024 * 1024;
export function MediaUploader({
  photos,
  onChange,
  onFilesChange,
  error,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  onFilesChange?: (files: File[]) => void;
  error?: string | undefined;
}) {
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
          const inputFiles = Array.from(event.target.files ?? []);
          if (photos.length + inputFiles.length > 5) {
            setMessage("You can add up to five photos.");
            return;
          }
          const invalid = inputFiles.find(
            (file) =>
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > MAX_BYTES,
          );
          if (invalid) {
            setMessage("Choose JPEG, PNG, or WebP images under 5 MB each.");
            return;
          }
          setMessage("");
          const nextFiles = [...selectedFiles, ...inputFiles];
          setSelectedFiles(nextFiles);
          onFilesChange?.(nextFiles);
          onChange([...photos, ...inputFiles.map((file) => URL.createObjectURL(file))]);
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
              onClick={() => {
                const nextPhotos = photos.filter((_, i) => i !== index);
                const nextFiles = selectedFiles.filter((_, i) => i !== index);
                setSelectedFiles(nextFiles);
                onFilesChange?.(nextFiles);
                onChange(nextPhotos);
              }}
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
