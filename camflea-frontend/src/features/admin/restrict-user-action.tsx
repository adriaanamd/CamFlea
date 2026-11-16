import { useState, type ReactElement } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const DURATION_OPTIONS = [
  { value: "indefinite", label: "Indefinite" },
  { value: "24-hours", label: "24 hours" },
  { value: "7-days", label: "7 days" },
  { value: "30-days", label: "30 days" },
  { value: "custom", label: "Custom date and time" },
] as const;

type RestrictionDuration = (typeof DURATION_OPTIONS)[number]["value"];

export type RestrictUserConfirmation = {
  reason: string;
  restrictionExpiresAt: string | null;
};

export function RestrictUserAction({
  userName,
  onConfirm,
  children,
}: {
  userName: string;
  onConfirm: (value: RestrictUserConfirmation) => void | Promise<void>;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<RestrictionDuration>("indefinite");
  const [customExpiresAt, setCustomExpiresAt] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    let restrictionExpiresAt: string | null = null;
    if (duration === "custom") {
      if (!customExpiresAt) {
        setError("Choose an expiration date and time.");
        return;
      }
      restrictionExpiresAt = new Date(customExpiresAt).toISOString();
    } else if (duration !== "indefinite") {
      const durationMs = duration === "24-hours" ? 24 : duration === "7-days" ? 7 * 24 : 30 * 24;
      restrictionExpiresAt = new Date(Date.now() + durationMs * 60 * 60 * 1000).toISOString();
    }

    setPending(true);
    setError("");
    try {
      await onConfirm({ reason: reason.trim(), restrictionExpiresAt });
      setOpen(false);
      setReason("");
      setCustomExpiresAt("");
      setDuration("indefinite");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restrict {userName}</AlertDialogTitle>
          <AlertDialogDescription>
            This account can still browse listings, but cannot purchase, message, or post items.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="restrict-duration" className="text-sm font-medium">
              Restriction duration
            </label>
            <select
              id="restrict-duration"
              aria-label="Restriction duration"
              value={duration}
              onChange={(event) => {
                setDuration(event.target.value as RestrictionDuration);
                setError("");
              }}
              disabled={pending}
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {duration === "custom" ? (
            <div className="space-y-2">
              <label htmlFor="restrict-custom-expires" className="text-sm font-medium">
                Custom expiration
              </label>
              <input
                id="restrict-custom-expires"
                aria-label="Custom expiration"
                type="datetime-local"
                value={customExpiresAt}
                onChange={(event) => setCustomExpiresAt(event.target.value)}
                disabled={pending}
              />
            </div>
          ) : null}
          <Textarea
            aria-label="Restriction reason"
            placeholder="Reason (optional)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={pending}
          />
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Go back</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => void confirm()}>
            {pending ? "Restricting..." : "Restrict"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
