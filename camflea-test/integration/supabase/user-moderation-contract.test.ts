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
});
