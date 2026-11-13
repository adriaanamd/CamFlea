import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { canAccessReportQueue } from "@/features/admin/report-access";
import { reportQueuePageSize, type ReportQueueFilters } from "@/features/admin/report-actions";
const reportQueueProjection =
  "id, reason, details, status, created_at, listing_id, reported_user_id";

async function assertStaffAccess(client: SupabaseClient<Database>, userId: string) {
  const roles = await Promise.all(
    (["admin", "moderator"] as const).map(async (role) => {
      const { data, error } = await client.rpc("has_role", { _user_id: userId, _role: role });
      if (error) throw new Error("Unable to verify staff access.");
      return data ? role : null;
    }),
  );
  if (!canAccessReportQueue(roles.filter((role): role is "admin" | "moderator" => role !== null))) {
    throw new Error("Staff access required.");
  }
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
  const { error } = await client.rpc("marketplace_review_report", {
    _report_id: reportId,
    _status: "reviewed",
  });
  if (error) throw new Error("Unable to mark report as reviewed.");
  return { id: reportId };
}

