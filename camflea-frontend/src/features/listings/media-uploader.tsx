import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";

import { ConfirmAction } from "@/components/confirm-action";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 5;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

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
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(inputFiles: File[]) {
    if (!inputFiles.length) return;
    if (photos.length + inputFiles.length > MAX_PHOTOS) {
      setMessage("You can add up to five photos.");
      return;
    }
    const invalid = inputFiles.find((file) => !TYPES.includes(file.type) || file.size > MAX_BYTES);
    if (invalid) {
      setMessage("Choose JPEG, PNG, or WebP images under 5 MB each.");
      return;
    }
    setMessage("");
    const nextFiles = [...selectedFiles, ...inputFiles];
    setSelectedFiles(nextFiles);
    onFilesChange?.(nextFiles);
    onChange([...photos, ...inputFiles.map((file) => URL.createObjectURL(file))]);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="listing-photos"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-6 text-center transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 ${
          dragging ? "border-primary bg-accent" : "border-primary/50 bg-white hover:bg-accent/60"
        }`}
      >
        <ImagePlus aria-hidden="true" className="text-primary" size={28} />
        <span className="font-semibold">Photos (up to 5)</span>
        <span className="text-xs font-normal text-muted-foreground">
          Drag images here or click to browse · JPEG, PNG or WebP · max 5 MB each · {photos.length}/
          {MAX_PHOTOS} added
        </span>
        <input
          ref={inputRef}
          id="listing-photos"
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </label>
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {photos.map((photo, index) => (
            <li className="relative h-24 w-24" key={`${photo}-${index}`}>
              <img
                className="h-full w-full rounded-xl border object-cover"
                src={photo}
                alt={`Selected photo ${index + 1}`}
              />
              {index === 0 && (
                <span className="absolute bottom-1 left-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  Cover
                </span>
              )}
              <ConfirmAction
                description={`Remove photo ${index + 1} from this listing?`}
                confirmLabel="Remove photo"
                onConfirm={() => {
                  const nextPhotos = photos.filter((_, i) => i !== index);
                  const nextFiles = selectedFiles.filter((_, i) => i !== index);
                  setSelectedFiles(nextFiles);
                  onFilesChange?.(nextFiles);
                  onChange(nextPhotos);
                }}
              >
                <button
                  type="button"
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border bg-background shadow hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X aria-hidden="true" size={14} />
                </button>
              </ConfirmAction>
            </li>
          ))}
        </ul>
      )}
      {(message || error) && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {message || error}
        </p>
      )}
    </div>
  );
}
