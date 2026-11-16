import { describe, expect, it } from "vitest";
import { canUseMarketplace, effectiveAccountStatus } from "@/lib/domain/account-status";

describe("account status", () => {
  it("treats an expired restriction as active", () => {
    expect(
      effectiveAccountStatus(
        "restricted",
        "2026-01-01T00:00:00.000Z",
        new Date("2026-01-02T00:00:00.000Z"),
      ),
    ).toBe("active");
  });

  it("keeps a future restriction restricted", () => {
    expect(
      effectiveAccountStatus(
        "restricted",
        "2026-01-03T00:00:00.000Z",
        new Date("2026-01-02T00:00:00.000Z"),
      ),
    ).toBe("restricted");
  });

  it("never expires a ban", () => {
    expect(effectiveAccountStatus("banned", null, new Date("2026-01-02T00:00:00.000Z"))).toBe(
      "banned",
    );
  });

  it("only allows active users to mutate the marketplace", () => {
    expect(canUseMarketplace("active")).toBe(true);
    expect(canUseMarketplace("restricted")).toBe(false);
    expect(canUseMarketplace("banned")).toBe(false);
  });
});
