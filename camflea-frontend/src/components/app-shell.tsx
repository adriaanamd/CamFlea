import type { ReactNode } from "react";

import { AccountStatusBanner } from "@/components/account-status-banner";
import { NavBar } from "@/components/nav-bar";
import type { AccountStatusSnapshot } from "@/lib/domain/account-status";

type AppShellProps = {
  children: ReactNode;
  user: { firstName: string; profileImage?: string | null } | null;
  unreadCount: number;
  isStaff: boolean;
  isAdmin?: boolean;
  accountStatus?: AccountStatusSnapshot;
};

export function AppShell({
  children,
  user,
  unreadCount,
  isStaff,
  isAdmin = false,
  accountStatus,
}: AppShellProps) {
  return (
    <NavBar user={user} unreadCount={unreadCount} isStaff={isStaff} isAdmin={isAdmin}>
      {accountStatus ? (
        <AccountStatusBanner
          status={accountStatus.status}
          restrictionExpiresAt={accountStatus.restrictionExpiresAt}
        />
      ) : null}
      {children}
    </NavBar>
  );
}
