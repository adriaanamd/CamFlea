export type AccountStatus = "active" | "restricted" | "banned";

export function effectiveAccountStatus(
  status: AccountStatus,
  restrictionExpiresAt: string | null | undefined,
  now = new Date(),
): AccountStatus {
  if (status !== "restricted" || !restrictionExpiresAt) return status;
  return new Date(restrictionExpiresAt).getTime() <= now.getTime() ? "active" : "restricted";
}

export function canUseMarketplace(status: AccountStatus) {
  return status === "active";
}
