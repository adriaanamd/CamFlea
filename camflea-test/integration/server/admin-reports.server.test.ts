import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";

import { AdminReportQueue } from "@/features/admin/report-queue";
import type { ReportQueueRecord } from "@/features/admin/report-queue";
import { listReportsForStaff, reviewReportForStaff } from "@/features/admin/report-actions.server";

describe("listReportsForStaff", () => {
  it("rejects a student before querying report records", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      from: vi.fn(),
    };

    await expect(
      listReportsForStaff(client as never, "student-id", { status: "open", page: 0 }),
    ).rejects.toThrow("Staff access required");

    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe("reviewReportForStaff", () => {
  it("updates only an open report after server-side staff verification", async () => {
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "report-1" }, error: null }),
    };
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: vi.fn().mockReturnValue(query),
    };

    await expect(reviewReportForStaff(client as never, "moderator-id", "report-1")).resolves.toEqual({ id: "report-1" });

    expect(client.rpc).toHaveBeenCalledWith("has_role", { _user_id: "moderator-id", _role: "admin" });
    expect(query.update).toHaveBeenCalledWith({ status: "reviewed" });
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", "report-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "status", "open");
  });
});

describe("AdminReportQueue", () => {
  it("renders the minimized report record returned by the authorized loader", async () => {
    const report: ReportQueueRecord = {
      id: "report-1",
      reason: "Spam listing",
      details: "Repeated misleading listings.",
      status: "open",
      created_at: "2026-11-12T10:00:00.000Z",
      listing_id: "listing-1",
      reported_user_id: null,
    };
    render(createElement(AdminReportQueue, { loadReports: vi.fn().mockResolvedValue([report]) }));

    expect(await screen.findByRole("heading", { name: "Community reports" })).not.toBeNull();
    expect(await screen.findByText("Spam listing")).not.toBeNull();
    expect(screen.getByText("Repeated misleading listings.")).not.toBeNull();
  });

  it("stops offering pagination when the next page is empty", async () => {
    const firstPage = Array.from({ length: 25 }, (_, index): ReportQueueRecord => ({
      id: `report-${index}`,
      reason: `Reason ${index}`,
      details: null,
      status: "open",
      created_at: "2026-11-12T10:00:00.000Z",
      listing_id: null,
      reported_user_id: null,
    }));
    const loadReports = vi.fn().mockResolvedValueOnce(firstPage).mockResolvedValueOnce([]);
    render(createElement(AdminReportQueue, { loadReports }));

    fireEvent.click(await screen.findByRole("button", { name: "Load more reports" }));
    await screen.findByRole("button", { name: "Loading…" });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Loading…" })).toBeNull());

    expect(screen.queryByRole("button", { name: "Load more reports" })).toBeNull();
  });
});
