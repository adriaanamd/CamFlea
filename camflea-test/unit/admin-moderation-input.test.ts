import { describe, expect, it } from "vitest";
import { adminAccountStatusInputSchema, adminUserActionInputSchema } from "@/features/admin/admin-actions";

const userId = "00000000-0000-4000-8000-000000000001";

describe("admin moderation input", () => {
  it("accepts an indefinite restriction", () => {
    expect(
      adminAccountStatusInputSchema.parse({
        userId,
        status: "restricted",
        reason: "Repeated spam",
      }),
    ).toMatchObject({ userId, status: "restricted" });
  });

  it("accepts an ISO expiration for a restriction", () => {
    expect(
      adminAccountStatusInputSchema.parse({
        userId,
        status: "restricted",
        restrictionExpiresAt: "2099-12-01T12:00:00.000Z",
      }).restrictionExpiresAt,
    ).toBe("2099-12-01T12:00:00.000Z");
  });

  it("rejects a duration for active or banned status", () => {
    expect(
      adminAccountStatusInputSchema.safeParse({
        userId,
        status: "banned",
        restrictionExpiresAt: "2099-12-01T12:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("keeps warning reason optional", () => {
    expect(adminUserActionInputSchema.parse({ userId })).toEqual({ userId });
  });
});
