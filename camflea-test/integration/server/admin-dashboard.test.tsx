import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminDashboard } from "@/features/admin/admin-dashboard";
import type { AdminWorkspaceData } from "@/features/admin/admin-actions";

const emptyAnalytics: AdminWorkspaceData["analytics"] = {
  usersByYear: [],
  studentsByProgram: [],
  listingsByCategory: [],
  listingsByStatus: [],
  listingsByCondition: [],
  listingsByPriceType: [],
  listingsByPriceRange: [],
  transactionsByStatus: [],
  reportsByReason: [],
  listingsByMonth: [],
  averageDaysToSell: null,
};

const workspace: AdminWorkspaceData = {
  users: [],
  listings: [],
  transactions: [],
  reports: [],
  analytics: emptyAnalytics,
};

describe("AdminDashboard", () => {
  it("renders the legacy dashboard sections and all admin tabs", async () => {
    render(<AdminDashboard loadWorkspace={vi.fn().mockResolvedValue(workspace)} />);

    expect(await screen.findByRole("heading", { name: "Admin dashboard" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "User analytics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Academic analytics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Marketplace analytics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pricing analytics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Transaction analytics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Trends & reports" })).toBeVisible();

    for (const tab of [
      "User Management",
      "Post & Item Management",
      "Transaction Monitoring",
      "Reports & Violations Center",
    ]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument();
    }
  });

  it("switches between the legacy admin tabs", async () => {
    render(<AdminDashboard loadWorkspace={vi.fn().mockResolvedValue(workspace)} />);

    fireEvent.click(await screen.findByRole("tab", { name: "User Management" }));
    expect(screen.getByRole("heading", { name: "User management" })).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "Post & Item Management" }));
    expect(screen.getByRole("heading", { name: "Post & item management" })).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "Transaction Monitoring" }));
    expect(screen.getByRole("heading", { name: "Transaction monitoring" })).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "Reports & Violations Center" }));
    expect(screen.getByRole("heading", { name: "Reports & violations center" })).toBeVisible();
  });
});
