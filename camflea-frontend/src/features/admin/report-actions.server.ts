import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { canAccessReportQueue } from "@/features/admin/report-access";

export const reportQueuePageSize = 25;
const reportQueueProjection =
  "id, reason, details, status, created_at, listing_id, reported_user_id";

export type ReportQueueFilters = {
  status: "all" | "open" | "reviewed";
  page: number;
};

async function assertStaffAccess(client: SupabaseClient<Database>, userId: string) {
  const { data, error } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error("Unable to verify staff access.");
  if (!canAccessReportQueue(data ? ["admin"] : [])) throw new Error("Staff access required.");
}

export async function listReportsForStaff(
  client: SupabaseClient<Database>,
  userId: string,
  filters: ReportQueueFilters,
) {
  await assertStaffAccess(client, userId);

  let query = client
    .from("marketplace_reports")
    .select(reportQueueProjection)
    .order("created_at", { ascending: false });
  if (filters.status !== "all") query = query.eq("status", filters.status);
  const start = filters.page * reportQueuePageSize;
  const { data, error } = await query.range(start, start + reportQueuePageSize - 1);
  if (error) throw new Error("Unable to load community reports.");
  return data ?? [];
}

export async function reviewReportForStaff(
  client: SupabaseClient<Database>,
  userId: string,
  reportId: string,
) {
  await assertStaffAccess(client, userId);
  const { data, error } = await client
    .from("marketplace_reports")
    .update({ status: "reviewed" })
    .eq("id", reportId)
    .eq("status", "open")
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Unable to mark report as reviewed.");
  if (!data) throw new Error("Report is no longer open.");
  return data;
}

export const loadAdminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      status: z.enum(["all", "open", "reviewed"]),
      page: z.number().int().min(0).max(100),
    }),
  )
  .handler(({ data, context }) => listReportsForStaff(context.supabase, context.userId, data));

export const reviewAdminReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(({ data, context }) => reviewReportForStaff(context.supabase, context.userId, data.id));
