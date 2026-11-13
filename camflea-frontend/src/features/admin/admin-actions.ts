import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  AdminAnalytics,
  AdminListing,
  AdminReport,
  AdminTransaction,
  AdminUser,
} from "@/features/admin/admin-dashboard-data";

const userId = z.string().uuid();
const reason = z.string().trim().max(500).optional();

export const adminUserActionInputSchema = z.object({ userId, reason });
export const adminAccountStatusInputSchema = z.object({
  userId,
  status: z.enum(["active", "restricted", "banned"]),
  reason,
});
export const adminListingFlagsInputSchema = z.object({
  listingId: userId,
  isPinned: z.boolean(),
  isVerified: z.boolean(),
});
export const adminListingDeleteInputSchema = z.object({ listingId: userId, reason });

export type AdminWorkspaceData = {
  users: AdminUser[];
  listings: AdminListing[];
  transactions: AdminTransaction[];
  reports: AdminReport[];
  analytics: AdminAnalytics;
};

export const loadAdminWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listAdminWorkspace } = await import("@/features/admin/admin-actions.server");
    return listAdminWorkspace(context.supabase, context.userId);
  });

export const adminWarnUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(adminUserActionInputSchema)
  .handler(async ({ data, context }) => {
    const { warnUserForAdmin } = await import("@/features/admin/admin-actions.server");
    return warnUserForAdmin(context.supabase, context.userId, data);
  });

export const adminSetAccountStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(adminAccountStatusInputSchema)
  .handler(async ({ data, context }) => {
    const { setAccountStatusForAdmin } = await import("@/features/admin/admin-actions.server");
    return setAccountStatusForAdmin(context.supabase, context.userId, data);
  });

export const adminSetListingFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(adminListingFlagsInputSchema)
  .handler(async ({ data, context }) => {
    const { setListingFlagsForAdmin } = await import("@/features/admin/admin-actions.server");
    return setListingFlagsForAdmin(context.supabase, context.userId, data);
  });

export const adminDeleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(adminListingDeleteInputSchema)
  .handler(async ({ data, context }) => {
    const { deleteListingForAdmin } = await import("@/features/admin/admin-actions.server");
    return deleteListingForAdmin(context.supabase, context.userId, data);
  });
