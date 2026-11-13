import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminDashboard } from "@/features/admin/admin-dashboard";
import type { AdminWorkspaceData } from "@/features/admin/admin-actions";
import type { AdminListing, AdminReport, AdminUser } from "@/features/admin/admin-dashboard-data";

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

const user: AdminUser = {
  user_id: "11111111-1111-4111-8111-111111111111",
  email: "student@example.com",
  first_name: "Student",
  last_name: "Example",
  school: "Columban College",
  program: "BSIT",
  year_level: "2nd year",
  profile_image: null,
  bio: null,
  is_banned: false,
  status: "active",
  reason: null,
  warning_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const listing = {
  id: "22222222-2222-4222-8222-222222222222",
  title: "Calculus book",
  description: "A useful textbook",
  category: "Books & School Supplies",
  condition: "Good",
  price_type: "single",
  price: 500,
  price_min: null,
  price_max: null,
  photos: [],
  meeting_place: "Library",
  status: "available",
  is_pinned: false,
  is_verified: false,
  seller_id: user.user_id,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as AdminListing;

const report = {
  id: "33333333-3333-4333-8333-333333333333",
  reporter_id: user.user_id,
  listing_id: listing.id,
  reported_user_id: user.user_id,
  reason: "Spam",
  details: "Repeated messages",
  status: "open",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
} as AdminReport;

const destructiveWorkspace: AdminWorkspaceData = {
  ...workspace,
  users: [user],
  listings: [listing],
  reports: [report],
};

describe("AdminDashboard", () => {
  it("renders the legacy dashboard sections", async () => {
    render(<AdminDashboard loadWorkspace={vi.fn().mockResolvedValue(workspace)} />);

    expect(await screen.findByRole("heading", { name: "Admin dashboard" })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "User analytics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Academic analytics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Marketplace analytics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pricing analytics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Transaction analytics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Trends & reports" })).toBeVisible();

  });

  it.each([
    ["users", "User management"],
    ["items", "Post & item management"],
    ["transactions", "Transaction monitoring"],
    ["reports", "Reports & violations center"],
  ] as const)("renders the legacy %s admin tab", async (tab, heading) => {
    render(<AdminDashboard tab={tab} loadWorkspace={vi.fn().mockResolvedValue(workspace)} />);

    expect(await screen.findByRole("heading", { name: heading })).toBeVisible();
  });

  it("requires confirmation before warning a user", async () => {
    const warnUser = vi.fn().mockResolvedValue({ warningCount: 1 });
    render(<AdminDashboard tab="users" loadWorkspace={vi.fn().mockResolvedValue(destructiveWorkspace)} warnUser={warnUser} />);

    fireEvent.click(await screen.findByRole("button", { name: "Warn" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure?");
    expect(warnUser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Warn user" }));
    await waitFor(() => expect(warnUser).toHaveBeenCalledTimes(1));
  });

  it("requires confirmation before restricting a user", async () => {
    const setAccountStatus = vi.fn().mockResolvedValue({ success: true });
    render(<AdminDashboard tab="users" loadWorkspace={vi.fn().mockResolvedValue(destructiveWorkspace)} setAccountStatus={setAccountStatus} />);

    fireEvent.click(await screen.findByRole("button", { name: "Restrict" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure?");
    expect(setAccountStatus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Restrict", exact: true }));
    await waitFor(() => expect(setAccountStatus).toHaveBeenCalledTimes(1));
  });

  it("requires confirmation before banning a user", async () => {
    const setAccountStatus = vi.fn().mockResolvedValue({ success: true });
    render(<AdminDashboard tab="users" loadWorkspace={vi.fn().mockResolvedValue(destructiveWorkspace)} setAccountStatus={setAccountStatus} />);

    fireEvent.click(await screen.findByRole("button", { name: "Ban" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure?");
    expect(setAccountStatus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ban user" }));
    await waitFor(() => expect(setAccountStatus).toHaveBeenCalledTimes(1));
  });

  it("requires confirmation before removing a listing", async () => {
    const deleteListing = vi.fn().mockResolvedValue({ success: true });
    render(<AdminDashboard tab="items" loadWorkspace={vi.fn().mockResolvedValue(destructiveWorkspace)} deleteListing={deleteListing} />);

    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure?");
    expect(deleteListing).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove listing" }));
    await waitFor(() => expect(deleteListing).toHaveBeenCalledTimes(1));
  });

  it("requires confirmation before dismissing a report", async () => {
    const reviewReport = vi.fn().mockResolvedValue({ id: report.id });
    render(<AdminDashboard tab="reports" loadWorkspace={vi.fn().mockResolvedValue(destructiveWorkspace)} reviewReport={reviewReport} />);

    fireEvent.click(await screen.findByRole("button", { name: "Dismiss" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure?");
    expect(reviewReport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss report" }));
    await waitFor(() => expect(reviewReport).toHaveBeenCalledTimes(1));
  });
});
