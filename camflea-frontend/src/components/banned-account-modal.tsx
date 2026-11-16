import { Ban } from "lucide-react";

export function BannedAccountModal({
  onSignOut,
}: {
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <div className="banned-account-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="banned-account-title"
        className="banned-account-modal"
      >
        <div className="banned-account-icon" aria-hidden="true">
          <Ban size={34} strokeWidth={2.2} />
        </div>
        <h2 id="banned-account-title">You are banned from CamFlea</h2>
        <p>
          Your account has been permanently restricted from the platform because of community
          guideline violations.
        </p>
        <button type="button" onClick={() => void onSignOut()}>
          Sign out
        </button>
      </section>
    </div>
  );
}
