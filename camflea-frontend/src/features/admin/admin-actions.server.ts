import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import {
  buildAdminAnalytics,
  type AdminListing,
  type AdminReport,
  type AdminTransaction,
  type AdminUser,
} from "@/features/admin/admin-dashboard-data";
import type {
  adminAccountStatusInputSchema,
  adminListingDeleteInputSchema,
  adminListingFlagsInputSchema,
  adminUserActionInputSchema,
} from "@/features/admin/admin-actions";
import type { z } from "zod";

type AdminClient = SupabaseClient<Database>;

const listingProjection =
  "id,title,description,category,condition,price_type,price,price_min,price_max,photos,meeting_place,status,is_pinned,is_verified,seller_id,created_at,updated_at";
const transactionProjection =
  "id,buyer_id,seller_id,listing_id,status,cancellation_reason,listing_title_snapshot,price_type_snapshot,price_snapshot,price_min_snapshot,price_max_snapshot,created_at,updated_at";
const reportProjection = "id,reporter_id,listing_id,reported_user_id,reason,details,status,created_at,updated_at";

type UserActionInput = z.infer<typeof adminUserActionInputSchema>;
type AccountStatusInput = z.infer<typeof adminAccountStatusInputSchema>;
type ListingFlagsInput = z.infer<typeof adminListingFlagsInputSchema>;
type ListingDeleteInput = z.infer<typeof adminListingDeleteInputSchema>;

export async function assertAdminAccess(client: AdminClient, userId: string) {
  const { data, error } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error("Unable to verify administrator access.");
  if (!data) throw new Error("Administrator access required.");
}

export async function listAdminWorkspace(client: AdminClient, userId: string) {
  await assertAdminAccess(client, userId);

  const [usersResult, listingsResult, transactionsResult, reportsResult] = await Promise.all([
    client.rpc("admin_list_student_profiles"),
    client.from("marketplace_listings").select(listingProjection).order("created_at", { ascending: false }),
    client.from("marketplace_transactions").select(transactionProjection).order("created_at", { ascending: false }),
    client.from("marketplace_reports").select(reportProjection).order("created_at", { ascending: false }),
  ]);

  if (usersResult.error || listingsResult.error || transactionsResult.error || reportsResult.error) {
    throw new Error("Unable to load the administrator workspace.");
  }

  const users = (usersResult.data ?? []) as AdminUser[];
  const listings = (listingsResult.data ?? []) as AdminListing[];
  const transactions = (transactionsResult.data ?? []) as AdminTransaction[];
  const reports = (reportsResult.data ?? []) as AdminReport[];

  return {
    users,
    listings,
    transactions,
    reports,
    analytics: buildAdminAnalytics(users, listings, transactions, reports),
  };
}

export async function warnUserForAdmin(
  client: AdminClient,
  userId: string,
  input: UserActionInput,
) {
  await assertAdminAccess(client, userId);
  const { data, error } = await client.rpc("admin_warn_user", {
    _user_id: input.userId,
    _reason: input.reason ?? null,
  });
  if (error) throw new Error("Unable to warn this user.");
  return { warningCount: data };
}

export async function setAccountStatusForAdmin(
  client: AdminClient,
  userId: string,
  input: AccountStatusInput,
) {
  await assertAdminAccess(client, userId);
  const { error } = await client.rpc("admin_set_account_status", {
    _user_id: input.userId,
    _status: input.status,
    _reason: input.reason ?? null,
  });
  if (error) throw new Error("Unable to update this account status.");
  return { success: true };
}

export async function setListingFlagsForAdmin(
  client: AdminClient,
  userId: string,
  input: ListingFlagsInput,
) {
  await assertAdminAccess(client, userId);
  const { error } = await client.rpc("admin_set_listing_flags", {
    _listing_id: input.listingId,
    _is_pinned: input.isPinned,
    _is_verified: input.isVerified,
  });
  if (error) throw new Error("Unable to update listing flags.");
  return { success: true };
}

export async function deleteListingForAdmin(
  client: AdminClient,
  userId: string,
  input: ListingDeleteInput,
) {
  await assertAdminAccess(client, userId);
  const { error } = await client.rpc("admin_delete_listing", {
    _listing_id: input.listingId,
    _reason: input.reason ?? null,
  });
  if (error) throw new Error("Unable to remove this listing.");
  return { success: true };
}
