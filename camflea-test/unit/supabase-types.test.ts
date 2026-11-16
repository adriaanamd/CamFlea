import type { Database } from "../../camflea-frontend/src/integrations/supabase/types";
import { describe, expectTypeOf, it } from "vitest";

type AccountStatusRow = Database["public"]["Tables"]["marketplace_account_status"]["Row"];
type AccountStatusArgs = Database["public"]["Functions"]["admin_set_account_status"]["Args"];
type AdminUserRow = Database["public"]["Functions"]["admin_list_student_profiles"]["Returns"][number];

describe("moderation database types", () => {
  it("includes expiry, status lookup, and per-user statistics fields", () => {
    expectTypeOf<AccountStatusRow>().toHaveProperty("restriction_expires_at");
    expectTypeOf<AccountStatusArgs>().toHaveProperty("_restriction_expires_at");
    expectTypeOf<AdminUserRow>().toHaveProperty("listing_count");
    expectTypeOf<AdminUserRow>().toHaveProperty("available_listing_count");
    expectTypeOf<AdminUserRow>().toHaveProperty("sold_listing_count");
    expectTypeOf<AdminUserRow>().toHaveProperty("transaction_count");
    expectTypeOf<AdminUserRow>().toHaveProperty("completed_purchase_count");
    expectTypeOf<AdminUserRow>().toHaveProperty("message_count");
    expectTypeOf<AdminUserRow>().toHaveProperty("report_count");
  });
});
