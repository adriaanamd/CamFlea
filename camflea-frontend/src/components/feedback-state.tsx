import type { ReactNode } from "react";

import { AlertCircle, CheckCircle2, Inbox, LoaderCircle, LockKeyhole, PackageOpen } from "lucide-react";

type FeedbackKind = "loading" | "empty" | "error" | "restricted" | "unavailable" | "success";

const icons: Record<FeedbackKind, typeof LoaderCircle> = {
  loading: LoaderCircle,
  empty: Inbox,
  error: AlertCircle,
  restricted: LockKeyhole,
  unavailable: PackageOpen,
  success: CheckCircle2,
};

type FeedbackStateProps = {
  kind: FeedbackKind;
  title: string;
  copy?: string;
  action?: ReactNode;
};

export function FeedbackState({ kind, title, copy, action }: FeedbackStateProps) {
  const Icon = icons[kind];

  return (
    <section className={`feedback-state feedback-state-${kind}`} role="status" aria-live={kind === "error" ? "assertive" : "polite"}>
      <span className="feedback-state-icon" aria-hidden="true">
        <Icon size={24} className={kind === "loading" ? "feedback-state-spinner" : undefined} />
      </span>
      <h2>{title}</h2>
      {copy ? <p>{copy}</p> : null}
      {action ? <div className="feedback-state-action">{action}</div> : null}
    </section>
  );
}
