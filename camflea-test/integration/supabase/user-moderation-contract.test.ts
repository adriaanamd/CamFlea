import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "../camflea-supabase/migrations/20261116130000_user_moderation_controls.sql",
);

describe("user moderation migration", () => {
  function readMigration() {
    expect(existsSync(migrationPath)).toBe(true);
    return existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";
  }

  it("contains restriction expiry storage", () => {
    const sql = readMigration();
    expect(sql).toMatch(/restriction_expires_at/i);
  });

  it("contains effective account status functions", () => {
    const sql = readMigration();
    expect(sql).toMatch(/marketplace_effective_account_status/i);
    expect(sql).toMatch(/marketplace_get_my_account_status/i);
    expect(sql).toMatch(/RETURNS TEXT[\s\S]*marketplace_effective_account_status/i);
    expect(sql).toMatch(/RETURNS TABLE[\s\S]*marketplace_get_my_account_status/i);
    expect(sql).toMatch(/status = 'restricted'[\s\S]*restriction_expires_at > now\(\)/i);
  });

  it("contains admin statistics and marketplace guard surfaces", () => {
    const sql = readMigration();
    expect(sql).toMatch(/listing_count/i);
    expect(sql).toMatch(/message_count/i);
    expect(sql).toMatch(/marketplace_send_message/i);
    expect(sql).toMatch(/marketplace_add_to_cart/i);
    expect(sql).toMatch(/marketplace_listings/i);
  });

  it("returns activity statistics from the admin user listing", () => {
    const sql = readMigration();
    for (const column of [
      "restriction_expires_at",
      "listing_count",
      "available_listing_count",
      "sold_listing_count",
      "transaction_count",
      "completed_purchase_count",
      "message_count",
      "report_count",
    ]) {
      expect(sql).toMatch(new RegExp(column, "i"));
    }
    expect(sql).toMatch(/marketplace_messages[\s\S]*sender_id = profile\.user_id/i);
    expect(sql).toMatch(/marketplace_reports[\s\S]*reported_user_id = profile\.user_id/i);
  });

  it("supports duration-aware account status changes", () => {
    const sql = readMigration();
    expect(sql).toMatch(/admin_set_account_status\([\s\S]*_restriction_expires_at TIMESTAMPTZ/i);
    expect(sql).toMatch(/effective_expiration IS NOT NULL[\s\S]*effective_expiration <= now\(\)/i);
    expect(sql).toMatch(/restriction_expires_at = EXCLUDED\.restriction_expires_at/i);
  });
});
