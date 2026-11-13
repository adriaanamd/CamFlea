import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";

import { Navigation } from "@/components/navigation";

type AppShellProps = {
  children: ReactNode;
  user: { firstName: string; profileImage?: string | null } | null;
  unreadCount: number;
  isStaff: boolean;
};

export function AppShell({ children, user, unreadCount, isStaff }: AppShellProps) {
  return (
    <div className="camflea-shell">
      <header className="camflea-header">
        <Link to="/" className="camflea-brand" aria-label="CamFlea home">
          <img src="/camflea-assets/logo.png" alt="CamFlea" />
        </Link>
        <Navigation unreadCount={unreadCount} isStaff={isStaff} />
        <div className="camflea-header-account">
          {user ? (
            <Link to="/profile" className="camflea-account-chip">
              <img src={user.profileImage || "/camflea-assets/avatar-placeholder.png"} alt="" />
              <span>{user.firstName}</span>
            </Link>
          ) : (
            <Link to="/auth" className="camflea-login-link">
              Log in
            </Link>
          )}
        </div>
      </header>
      <main className="camflea-main">{children}</main>
    </div>
  );
}
