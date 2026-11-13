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

type ConfirmActionProps = {
  /** The single button element that opens the "Are you sure?" modal. */
  children: ReactElement;
  title?: string;
  description: string;
  confirmLabel: string;
  /** When set, shows an optional reason field and passes its value to onConfirm. */
  reasonLabel?: string;
  onConfirm: (reason: string) => void | Promise<void>;
};

/** Wraps any destructive trigger with an accessible confirmation modal. */
export function ConfirmAction({
  children,
  title = "Are you sure?",
  description,
  confirmLabel,
  reasonLabel,
  onConfirm,
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setPending(false);
      setOpen(false);
      setReason("");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {reasonLabel ? (
          <Textarea
            aria-label={reasonLabel}
            placeholder={reasonLabel}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Go back</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => void confirm()}>
            {pending ? "Working..." : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
