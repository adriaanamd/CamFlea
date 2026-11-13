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
          <img src="/camflea-assets/logo-white.png" alt="CamFlea" />
        </Link>
        <div className="camflea-header-title">
          <span>Campus marketplace</span>
          <strong>Good finds stay local.</strong>
        </div>
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
      <div className="camflea-layout">
        <aside className="camflea-sidebar" aria-label="Marketplace navigation">
          <div className="camflea-sidebar-label">MARKETPLACE</div>
          <Navigation unreadCount={unreadCount} isStaff={isStaff} />
          <div className="camflea-sidebar-note">
            <strong>Buy a little closer.</strong>
            <span>Trade useful things with people from your campus.</span>
          </div>
        </aside>
        <main className="camflea-main">{children}</main>
      </div>
    </div>
  );
}
