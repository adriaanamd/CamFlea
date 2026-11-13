import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const reportQueuePageSize = 25;

export type ReportQueueFilters = {
  status: "all" | "open" | "reviewed";
  page: number;
};

export const loadAdminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      status: z.enum(["all", "open", "reviewed"]),
      page: z.number().int().min(0).max(100),
    }),
  )
  .handler(async ({ data, context }) => {
    const { listReportsForStaff } = await import("@/features/admin/report-actions.server");
    return listReportsForStaff(context.supabase, context.userId, data);
  });

export const reviewAdminReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { reviewReportForStaff } = await import("@/features/admin/report-actions.server");
    return reviewReportForStaff(context.supabase, context.userId, data.id);
  });
