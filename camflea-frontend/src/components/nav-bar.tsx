import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";

import { Navigation } from "@/components/navigation";

export type NavBarProps = {
  children?: ReactNode;
  user: { firstName: string; profileImage?: string | null } | null;
  unreadCount: number;
  isStaff: boolean;
};

/** The single marketplace chrome shared by every authenticated route. */
export function NavBar({ children, user, unreadCount, isStaff }: NavBarProps) {
  return (
    <div className="camflea-shell">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-primary focus:shadow-lg"
      >
        Skip to content
      </a>
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
        <main id="main-content" tabIndex={-1} className="camflea-main">
          {children}
        </main>
      </div>
    </div>
  );
}
