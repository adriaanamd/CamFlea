import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminDashboard } from "@/features/admin/admin-dashboard";
import type { AdminWorkspaceData } from "@/features/admin/admin-actions";
import {
  buildAdminAnalytics,
  type AdminListing,
  type AdminReport,
  type AdminUser,
} from "@/features/admin/admin-dashboard-data";

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
  it("limits students by program analytics to the five most common programs", () => {
    const programCounts = [
      ["BSIT", 6],
      ["BSBA", 5],
      ["BSA", 4],
      ["BSEd", 3],
      ["BSHM", 2],
      ["BSN", 1],
    ] as const;
    const users = programCounts.flatMap(([program, count]) =>
      Array.from({ length: count }, (_, index) => ({
        ...user,
        user_id: `${program}-${index}`,
        program,
      })),
    );

    expect(buildAdminAnalytics(users, [], [], []).studentsByProgram).toEqual([
      { label: "BSIT", count: 6 },
      { label: "BSBA", count: 5 },
      { label: "BSA", count: 4 },
      { label: "BSEd", count: 3 },
      { label: "BSHM", count: 2 },
    ]);
  });

  it("renders the legacy dashboard sections", async () => {
    render(
      <AdminDashboard loadWorkspace={vi.fn().mockResolvedValue(workspace)} />,
    );

    expect(
      await screen.findByRole("heading", { name: "Admin dashboard" }),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", { name: "User analytics" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Marketplace analytics" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Pricing analytics" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Transaction analytics" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Trends & reports" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Academic analytics" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Users by year level chart showing users by year level",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Students by program chart showing students by program",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Items by status chart showing listings by status",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Items by price range chart showing listings by price range",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "Listing trends over time chart showing listings by month",
      }),
    ).toBeVisible();
  });

  it("renders accessible summaries for populated chart variants", async () => {
    const populatedWorkspace: AdminWorkspaceData = {
      ...workspace,
      analytics: {
        ...emptyAnalytics,
        usersByYear: [{ label: "1st Year", count: 3 }],
        studentsByProgram: [{ label: "BSIT", count: 3 }],
        listingsByCategory: [
          { label: "Books & School Supplies", count: 2 },
          { label: "Electronics", count: 1 },
        ],
        listingsByStatus: [
          { label: "available", count: 2 },
          { label: "sold", count: 1 },
        ],
        listingsByCondition: [{ label: "New", count: 2 }],
        listingsByPriceRange: [
          { label: "Under ₱500", count: 1 },
          { label: "₱500–₱1,499", count: 2 },
          { label: "₱1,500–₱2,999", count: 2 },
          { label: "₱3,000+", count: 0 },
          { label: "Price hidden", count: 1 },
        ],
        listingsByPriceType: [{ label: "single", count: 1 }],
        transactionsByStatus: [{ label: "completed", count: 1 }],
        reportsByReason: [
          { label: "Spam", count: 2 },
          { label: "Misleading listing", count: 1 },
        ],
        listingsByMonth: [{ label: "2026-08", count: 2 }],
      },
    };

    render(
      <AdminDashboard
        loadWorkspace={vi.fn().mockResolvedValue(populatedWorkspace)}
      />,
    );

    expect(
      await screen.findByRole("img", {
        name: "Items by status chart showing listings by status",
      }),
    ).toHaveTextContent("Available: 2");
    expect(
      screen.getByRole("img", {
        name: "Price type distribution chart showing listings by price type",
      }),
    ).toHaveTextContent("One price: 1");
    expect(
      screen.getByRole("img", {
        name: "Transaction status chart showing transactions by transaction status",
      }),
    ).toHaveTextContent("Completed: 1");
    expect(
      screen.getByRole("img", {
        name: "Listing trends over time chart showing listings by month",
      }),
    ).toHaveTextContent("Aug 2026: 2");

    const itemTypeChart = screen.getByRole("img", {
      name: "Items by type chart showing listings by item type",
    });
    const horizontalRows = itemTypeChart.querySelectorAll(".admin-horizontal-bar-row");

    expect(horizontalRows).toHaveLength(2);
    expect(itemTypeChart.querySelector(".admin-horizontal-bar-label")).toHaveTextContent(
      "Books & School Supplies",
    );
    expect(itemTypeChart.querySelector(".admin-horizontal-bar-value")).not.toBeInTheDocument();
    expect(itemTypeChart.querySelector(".admin-chart-bar-interaction")).toHaveAttribute(
      "aria-label",
      "Books & School Supplies: 2",
    );
    expect(itemTypeChart.querySelector(".admin-chart-bar-tooltip")).toHaveTextContent(
      "Books & School Supplies2",
    );
    expect(itemTypeChart.querySelectorAll("[data-chart-color]")).toHaveLength(2);
    expect(horizontalRows[0]?.querySelector(".admin-horizontal-bar-fill")).toHaveStyle({
      width: "100%",
    });

    const yearChart = screen.getByRole("img", {
      name: "Users by year level chart showing users by year level",
    });

    expect(yearChart.querySelector(".admin-column-bars")).toBeInTheDocument();
    expect(yearChart.querySelector(".admin-column-bar-label")).toHaveTextContent("1st Year");
    expect(yearChart.querySelector(".admin-column-bar-value")).not.toBeInTheDocument();

    const priceRangeChart = screen.getByRole("img", {
      name: "Items by price range chart showing listings by price range",
    });
    const columnFills = priceRangeChart.querySelectorAll(".admin-column-bar-fill");

    expect(columnFills).toHaveLength(5);
    expect(priceRangeChart.querySelector(".admin-column-bar-plot")).toBeInTheDocument();
    expect(columnFills[0]).toHaveStyle({ height: "50%" });
    expect(columnFills[1]).toHaveStyle({ height: "100%" });
    expect(priceRangeChart.querySelector(".admin-column-bar-value")).not.toBeInTheDocument();
    expect(priceRangeChart.querySelector(".admin-chart-bar-interaction")).toHaveAttribute(
      "aria-label",
      "Under ₱500: 1",
    );
  });

  it.each([
    ["users", "User management"],
    ["items", "Post & item management"],
    ["transactions", "Transaction monitoring"],
    ["reports", "Reports & violations center"],
  ] as const)("renders the legacy %s admin tab", async (tab, heading) => {
    render(
      <AdminDashboard
        tab={tab}
        loadWorkspace={vi.fn().mockResolvedValue(workspace)}
      />,
    );

    expect(await screen.findByRole("heading", { name: heading })).toBeVisible();
  });

  it("requires confirmation before warning a user", async () => {
    const warnUser = vi.fn().mockResolvedValue({ warningCount: 1 });
    render(
      <AdminDashboard
        tab="users"
        loadWorkspace={vi.fn().mockResolvedValue(destructiveWorkspace)}
        warnUser={warnUser}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Warn" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure?");
    expect(warnUser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Warn user" }));
    await waitFor(() => expect(warnUser).toHaveBeenCalledTimes(1));
  });

  it("requires confirmation before restricting a user", async () => {
    const setAccountStatus = vi.fn().mockResolvedValue({ success: true });
    render(
      <AdminDashboard
        tab="users"
        loadWorkspace={vi.fn().mockResolvedValue(destructiveWorkspace)}
        setAccountStatus={setAccountStatus}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Restrict" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure?");
    expect(setAccountStatus).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Restrict", exact: true }),
    );
    await waitFor(() => expect(setAccountStatus).toHaveBeenCalledTimes(1));
  });

  it("requires confirmation before banning a user", async () => {
    const setAccountStatus = vi.fn().mockResolvedValue({ success: true });
    render(
      <AdminDashboard
        tab="users"
        loadWorkspace={vi.fn().mockResolvedValue(destructiveWorkspace)}
        setAccountStatus={setAccountStatus}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Ban" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure?");
    expect(setAccountStatus).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ban user" }));
    await waitFor(() => expect(setAccountStatus).toHaveBeenCalledTimes(1));
  });

  it("requires confirmation before removing a listing", async () => {
    const deleteListing = vi.fn().mockResolvedValue({ success: true });
    render(
      <AdminDashboard
        tab="items"
        loadWorkspace={vi.fn().mockResolvedValue(destructiveWorkspace)}
        deleteListing={deleteListing}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure?");
    expect(deleteListing).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove listing" }));
    await waitFor(() => expect(deleteListing).toHaveBeenCalledTimes(1));
  });

  it("requires confirmation before dismissing a report", async () => {
    const reviewReport = vi.fn().mockResolvedValue({ id: report.id });
    render(
      <AdminDashboard
        tab="reports"
        loadWorkspace={vi.fn().mockResolvedValue(destructiveWorkspace)}
        reviewReport={reviewReport}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Dismiss" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure?");
    expect(reviewReport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss report" }));
    await waitFor(() => expect(reviewReport).toHaveBeenCalledTimes(1));
  });
});

describe("buildAdminAnalytics", () => {
  it("keeps ordinal and time distributions in semantic order", () => {
    const analyticsListings = [
      {
        ...listing,
        id: "listing-1",
        condition: "Fair",
        price: 3500,
        created_at: "2026-10-01T00:00:00Z",
      },
      {
        ...listing,
        id: "listing-2",
        condition: "New",
        price: 300,
        created_at: "2026-08-01T00:00:00Z",
      },
      {
        ...listing,
        id: "listing-3",
        condition: "Good",
        price: 500,
        created_at: "2026-10-02T00:00:00Z",
      },
      {
        ...listing,
        id: "listing-4",
        condition: "Good",
        price: 700,
        created_at: "2026-10-03T00:00:00Z",
      },
    ] as AdminListing[];
    const analytics = buildAdminAnalytics(
      [
        { ...user, year_level: "4th Year" },
        {
          ...user,
          user_id: "44444444-4444-4444-8444-444444444444",
          year_level: "4th Year",
        },
        {
          ...user,
          user_id: "55555555-5555-4555-8555-555555555555",
          year_level: "1st Year",
        },
      ],
      analyticsListings,
      [],
      [],
    );

    expect(analytics.usersByYear.map((value) => value.label)).toEqual([
      "1st Year",
      "4th Year",
    ]);
    expect(analytics.listingsByCondition.map((value) => value.label)).toEqual([
      "New",
      "Good",
      "Fair",
    ]);
    expect(analytics.listingsByPriceRange.map((value) => value.label)).toEqual([
      "Under ₱500",
      "₱500–₱1,499",
      "₱3,000+",
    ]);
    expect(analytics.listingsByMonth.map((value) => value.label)).toEqual([
      "2026-08",
      "2026-10",
    ]);
  });
});
