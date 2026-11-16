import type { AdminUser } from "@/features/admin/admin-dashboard-data";
import { describe, expect, it } from "vitest";

describe("admin user statistics", () => {
  it("accepts the moderation and activity fields", () => {
    const user: AdminUser = {
      user_id: "user",
      email: "student@example.test",
      first_name: "A",
      last_name: "Student",
      school: null,
      program: null,
      year_level: null,
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
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };

    expect(user.completed_purchase_count).toBe(1);
  });
});
