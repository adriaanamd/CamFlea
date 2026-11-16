import type { AccountStatus } from "@/lib/domain/account-status";

export function AccountStatusBanner({
  status,
  restrictionExpiresAt,
}: {
  status: AccountStatus;
  restrictionExpiresAt: string | null;
}) {
  if (status !== "restricted") return null;

  const expiry = restrictionExpiresAt
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(restrictionExpiresAt),
      )
    : "until an administrator restores your account";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Account restricted"
      className="account-status-banner"
    >
      <strong>Account restricted</strong>
      <span>
        You can browse listings, but you cannot post, message, or purchase. Restriction ends {expiry}.
      </span>
    </div>
  );
}
