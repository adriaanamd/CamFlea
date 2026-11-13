import type { ReactNode } from "react";

import { NavBar } from "@/components/nav-bar";

type AppShellProps = {
  children: ReactNode;
  user: { firstName: string; profileImage?: string | null } | null;
  unreadCount: number;
  isStaff: boolean;
  isAdmin?: boolean;
};

export function AppShell({ children, user, unreadCount, isStaff, isAdmin = false }: AppShellProps) {
  return (
    <NavBar user={user} unreadCount={unreadCount} isStaff={isStaff} isAdmin={isAdmin}>
      {children}
    </NavBar>
  );
}
