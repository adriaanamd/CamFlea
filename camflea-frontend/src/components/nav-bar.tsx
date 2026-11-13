import { useState, type ReactNode } from "react";

import { LogOut } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

import { Navigation } from "@/components/navigation";
import { supabase } from "@/integrations/supabase/client";

export type NavBarProps = {
  children?: ReactNode;
  user: { firstName: string; profileImage?: string | null } | null;
  unreadCount: number;
  isStaff: boolean;
  isAdmin?: boolean;
};

/** The single marketplace chrome shared by every authenticated route. */
export function NavBar({ children, user, unreadCount, isStaff, isAdmin = false }: NavBarProps) {
  const homePath = isAdmin ? "/admin" : "/browse";
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (!error) await navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="camflea-shell">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-primary focus:shadow-lg"
      >
        Skip to content
      </a>
      <header className="camflea-header">
        <Link
          to={homePath}
          className="camflea-brand"
          aria-label={isAdmin ? "CamFlea admin dashboard" : "CamFlea home"}
        >
          <img src="/camflea-assets/logo-white.png" alt="CamFlea" />
        </Link>
        <div className="camflea-header-title">
          <span>Campus marketplace</span>
          <strong>Good finds stay local.</strong>
        </div>
        <div className="camflea-header-account">
          {user ? (
            <Link to={isAdmin ? "/admin" : "/profile"} className="camflea-account-chip">
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
        <aside
          className="camflea-sidebar"
          aria-label={isAdmin ? "Admin navigation" : "Marketplace navigation"}
        >
          <div className="camflea-sidebar-label">{isAdmin ? "ADMINISTRATION" : "MARKETPLACE"}</div>
          <Navigation unreadCount={unreadCount} isStaff={isStaff} isAdmin={isAdmin} />
          {user ? (
            <button
              type="button"
              className="camflea-nav-link camflea-logout"
              disabled={signingOut}
              onClick={() => void handleLogout()}
            >
              <span className="camflea-nav-icon">
                <LogOut aria-hidden="true" size={18} strokeWidth={1.8} />
              </span>
              <span className="camflea-nav-text">{signingOut ? "Logging out…" : "Log out"}</span>
            </button>
          ) : null}
          <div className="camflea-sidebar-note">
            <strong>{isAdmin ? "Keep CamFlea safe." : "Buy a little closer."}</strong>
            <span>
              {isAdmin
                ? "Review the campus marketplace from one secure workspace."
                : "Trade useful things with people from your campus."}
            </span>
          </div>
        </aside>
        <main id="main-content" tabIndex={-1} className="camflea-main">
          {children}
        </main>
      </div>
    </div>
  );
}
