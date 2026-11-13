import {
  Bell,
  CircleUserRound,
  FileText,
  Flag,
  LayoutDashboard,
  Users,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  Plus,
  Search,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";

type NavigationProps = {
  unreadCount: number;
  isStaff: boolean;
  isAdmin?: boolean;
};

const groups = [
  {
    label: "Marketplace",
    items: [
      { to: "/browse", label: "Browse", icon: Search },
      { to: "/sell", label: "Post item", icon: Plus, cta: true },
    ],
  },
  {
    label: "Activity",
    items: [
      { to: "/transactions", label: "Transactions", icon: PackageCheck },
      { to: "/messages", label: "Messages", icon: MessageCircle },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Account",
    items: [{ to: "/profile", label: "Profile", icon: CircleUserRound }],
  },
] as const;

const adminItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/items", label: "Post & Item Management", icon: FileText },
  { to: "/admin/transactions", label: "Transaction Monitoring", icon: ReceiptText },
  { to: "/admin/reports", label: "Reports & Violations Center", icon: Flag },
] as const;

export function Navigation({ unreadCount, isStaff, isAdmin = false }: NavigationProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isActiveRoute = (to: string) => (to === "/" || to === "/admin" ? pathname === to || pathname === `${to}/` : pathname.startsWith(to));

  if (isAdmin) {
    return (
      <nav aria-label="Primary navigation" className="camflea-nav">
        <div className="camflea-nav-group" role="group" aria-label="Administration">
          {adminItems.map(({ to, label, icon: Icon }) => {
            const active = isActiveRoute(to);
            return (
              <Link
                key={to}
                to={to}
                className={`camflea-nav-link camflea-nav-link-staff${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="camflea-nav-icon">
                  <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                </span>
                <span className="camflea-nav-text">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Primary navigation" className="camflea-nav">
      {groups.map((group) => (
        <div key={group.label} className="camflea-nav-group" role="group" aria-label={group.label}>
          <span className="camflea-nav-group-label" aria-hidden="true">
            {group.label}
          </span>
          {group.items.map((item) => {
            const { to, label, icon: Icon } = item;
            const isActive = isActiveRoute(to);
            const isCta = "cta" in item && item.cta;
            return (
              <Link
                key={to}
                to={to}
                className={`camflea-nav-link${isActive ? " is-active" : ""}${isCta ? " camflea-nav-cta" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="camflea-nav-icon">
                  <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                  {label === "Notifications" && unreadCount > 0 ? (
                    <span className="camflea-nav-dot" aria-hidden="true" />
                  ) : null}
                </span>
                <span className="camflea-nav-text">{label}</span>
                {label === "Notifications" && unreadCount > 0 ? (
                  <span
                    className="camflea-nav-count"
                    aria-label={`${unreadCount} unread notifications`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
      {isStaff ? (
        <div className="camflea-nav-group" role="group" aria-label="Staff">
          <span className="camflea-nav-group-label" aria-hidden="true">
            Staff
          </span>
          <Link
            to="/admin"
            className={`camflea-nav-link camflea-nav-link-staff${isActiveRoute("/admin") ? " is-active" : ""}`}
            aria-current={isActiveRoute("/admin") ? "page" : undefined}
          >
            <span className="camflea-nav-icon">
              <LayoutDashboard aria-hidden="true" size={18} strokeWidth={1.8} />
            </span>
            <span className="camflea-nav-text">Admin</span>
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
