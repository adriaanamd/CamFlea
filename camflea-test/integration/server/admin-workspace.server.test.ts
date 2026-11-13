import { describe, expect, it, vi } from "vitest";

import {
  adminAccountStatusInputSchema,
  adminListingFlagsInputSchema,
  adminUserActionInputSchema,
} from "@/features/admin/admin-actions";
import { listAdminWorkspace } from "@/features/admin/admin-actions.server";

describe("listAdminWorkspace", () => {
  it("rejects a non-admin before loading admin data", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      from: vi.fn(),
    };

    await expect(listAdminWorkspace(client as never, "student-id")).rejects.toThrow(
      "Administrator access required",
    );
    expect(client.rpc).toHaveBeenCalledWith("has_role", {
      _user_id: "student-id",
      _role: "admin",
    });
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe("admin action validators", () => {
  it("allows only supported account statuses", () => {
    expect(
      adminAccountStatusInputSchema.parse({
        userId: "00000000-0000-0000-0000-000000000001",
        status: "restricted",
        reason: "Repeated unsafe listings",
      }),
    ).toMatchObject({ status: "restricted" });

    expect(() =>
      adminAccountStatusInputSchema.parse({
        userId: "00000000-0000-0000-0000-000000000001",
        status: "deleted",
      }),
    ).toThrow();
  });

  it("requires valid IDs for user and listing actions", () => {
    expect(() => adminUserActionInputSchema.parse({ userId: "not-a-uuid" })).toThrow();
    expect(() =>
      adminListingFlagsInputSchema.parse({
        listingId: "00000000-0000-0000-0000-000000000001",
        isPinned: true,
        isVerified: false,
      }),
    ).not.toThrow();
  });
});
