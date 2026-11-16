import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "../camflea-supabase/migrations/20261116130000_user_moderation_controls.sql",
);

describe("user moderation migration", () => {
  it("contains expiry, effective status, admin stats, and marketplace guards", () => {
    expect(existsSync(migrationPath)).toBe(true);
    if (!existsSync(migrationPath)) return;
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/restriction_expires_at/i);
    expect(sql).toMatch(/marketplace_effective_account_status/i);
    expect(sql).toMatch(/marketplace_get_my_account_status/i);
    expect(sql).toMatch(/listing_count/i);
    expect(sql).toMatch(/message_count/i);
    expect(sql).toMatch(/marketplace_send_message/i);
    expect(sql).toMatch(/marketplace_add_to_cart/i);
    expect(sql).toMatch(/marketplace_listings/i);
  });
});
