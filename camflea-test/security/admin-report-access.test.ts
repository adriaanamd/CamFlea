import { describe, expect, it } from "vitest";

import { canAccessReportQueue } from "@/features/admin/report-access";

describe("admin report queue access", () => {
  it("allows only roles that the current report RLS policy authorizes", () => {
    expect(canAccessReportQueue(["admin"])).toBe(true);
    expect(canAccessReportQueue(["moderator"])).toBe(true);
    expect(canAccessReportQueue(["student"])).toBe(false);
    expect(canAccessReportQueue([])).toBe(false);
  });
});
