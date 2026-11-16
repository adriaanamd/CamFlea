export type AccountStatus = "active" | "restricted" | "banned";

export type AccountStatusSnapshot = {
  status: AccountStatus;
  reason: string | null;
  restrictionExpiresAt: string | null;
  warningCount: number;
};

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
