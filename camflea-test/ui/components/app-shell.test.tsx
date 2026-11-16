import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/app-shell";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: "/" } }),
}));

function renderShell(isStaff: boolean, isAdmin = false) {
  return render(
    <AppShell user={{ firstName: "Ari" }} unreadCount={2} isStaff={isStaff} isAdmin={isAdmin}>
      <main>Content</main>
    </AppShell>,
  );
}

describe("AppShell", () => {
  it("keeps the marketplace destinations visibly labeled", () => {
    renderShell(true);

    expect(screen.getByRole("complementary", { name: "Marketplace navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Post item" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transactions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Messages" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Notifications/ })).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });

  it("does not expose staff navigation to a student", () => {
    renderShell(false);

    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("restricts an admin to the admin dashboard navigation", () => {
    renderShell(true, true);

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "User Management" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Post & Item Management" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transaction Monitoring" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reports & Violations Center" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Browse" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Post item" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Transactions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Messages" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
  });
});
