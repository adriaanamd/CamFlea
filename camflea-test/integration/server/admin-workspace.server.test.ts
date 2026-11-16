import { describe, expect, it, vi } from "vitest";

import {
  adminAccountStatusInputSchema,
  adminListingFlagsInputSchema,
  adminUserActionInputSchema,
} from "@/features/admin/admin-actions";
import { listAdminWorkspace, setAccountStatusForAdmin } from "@/features/admin/admin-actions.server";

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

describe("setAccountStatusForAdmin", () => {
  it("forwards a restriction expiration to the account status RPC", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const client = { rpc };
    const restrictionExpiresAt = "2099-01-01T00:00:00.000Z";

    await expect(
      setAccountStatusForAdmin(client as never, "admin-id", {
        userId: "00000000-0000-0000-0000-000000000001",
        status: "restricted",
        reason: "Repeated unsafe listings",
        restrictionExpiresAt,
      }),
    ).resolves.toEqual({ success: true });

    expect(rpc).toHaveBeenNthCalledWith(2, "admin_set_account_status", {
      _user_id: "00000000-0000-0000-0000-000000000001",
      _status: "restricted",
      _reason: "Repeated unsafe listings",
      _restriction_expires_at: restrictionExpiresAt,
    });
  });
});
