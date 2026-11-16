import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminUserManagement } from "@/features/admin/admin-user-management";
import type { AdminUser } from "@/features/admin/admin-dashboard-data";

const adminUserFixture: AdminUser = {
  user_id: "11111111-1111-4111-8111-111111111111",
  email: "student@example.com",
  first_name: "A",
  last_name: "Student",
  school: "Columban College",
  program: "BSIT",
  year_level: "2nd year",
  profile_image: null,
  bio: null,
  is_banned: false,
  status: "active",
  reason: null,
  warning_count: 2,
  restriction_expires_at: null,
  listing_count: 3,
  available_listing_count: 2,
  sold_listing_count: 1,
  transaction_count: 4,
  completed_purchase_count: 1,
  message_count: 6,
  report_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("AdminUserManagement", () => {
  it("shows per-user activity statistics", () => {
    render(
      <AdminUserManagement
        users={[adminUserFixture]}
        onAction={vi.fn()}
        warnUser={vi.fn()}
        setAccountStatus={vi.fn()}
      />,
    );

    expect(screen.getByText("3 listings")).toBeInTheDocument();
    expect(screen.getByText("1 completed purchase")).toBeInTheDocument();
    expect(screen.getByText("6 messages sent")).toBeInTheDocument();
    expect(screen.getByText("0 reports received")).toBeInTheDocument();
  });

  it("filters warned users", () => {
    render(
      <AdminUserManagement
        users={[adminUserFixture, { ...adminUserFixture, user_id: "222", first_name: "Quiet", warning_count: 0 }]}
        onAction={vi.fn()}
        warnUser={vi.fn()}
        setAccountStatus={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /filter users by status/i }), {
      target: { value: "warned" },
    });

    expect(screen.getByText("A Student")).toBeInTheDocument();
    expect(screen.queryByText("Quiet Student")).not.toBeInTheDocument();
  });
});
