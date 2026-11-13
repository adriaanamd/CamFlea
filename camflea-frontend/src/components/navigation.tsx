import {
  Bell,
  CircleUserRound,
  LayoutDashboard,
  MessageCircle,
  PackageCheck,
  Plus,
  Search,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";

type NavigationProps = {
  unreadCount: number;
  isStaff: boolean;
};

const primaryItems = [
  { to: "/", label: "Browse", icon: Search },
  { to: "/sell", label: "Post item", icon: Plus },
  { to: "/transactions", label: "Transactions", icon: PackageCheck },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: CircleUserRound },
] as const;

export function Navigation({ unreadCount, isStaff }: NavigationProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav aria-label="Primary navigation" className="camflea-nav">
      <div className="camflea-nav-group">
        {primaryItems.map(({ to, label, icon: Icon }) => {
          const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`camflea-nav-link${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Notifications" && unreadCount > 0 ? (
                <span className="camflea-nav-count" aria-label={`${unreadCount} unread notifications`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
      {isStaff ? (
        <Link
          to="/admin"
          className={`camflea-nav-link camflea-nav-link-staff${pathname.startsWith("/admin") ? " is-active" : ""}`}
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
        >
          <LayoutDashboard aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>Admin</span>
        </Link>
      ) : null}
    </nav>
  );
}
