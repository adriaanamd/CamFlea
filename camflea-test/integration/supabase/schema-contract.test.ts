import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "../camflea-supabase/migrations/20261113090000_camflea_mvp_hardening.sql",
);

function migrationSql() {
  return readFileSync(migrationPath, "utf8");
}

describe("CamFlea hardening migration", () => {
  it("stores private media metadata, transaction snapshots, and audit records", () => {
    const sql = migrationSql();

    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.marketplace_listing_media/i);
    expect(sql).toMatch(/storage_path/i);
    expect(sql).toMatch(/mime_type/i);
    expect(sql).toMatch(/byte_size/i);
    expect(sql).toMatch(/listing_title_snapshot/i);
    expect(sql).toMatch(/price_type_snapshot/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.marketplace_audit_log/i);
  });

  it("adds database constraints and active reservation indexes", () => {
    const sql = migrationSql();

    expect(sql).toMatch(/marketplace_listings.*price_type.*CHECK/i);
    expect(sql).toMatch(/marketplace_transactions.*status.*CHECK/i);
    expect(sql).toMatch(/CREATE UNIQUE INDEX.*active.*listing/i);
    expect(sql).toMatch(/marketplace_listing_media.*ordering/i);
  });

  it("removes broad participant mutation paths and private public media access", () => {
    const sql = migrationSql();

    expect(sql).toMatch(/REVOKE UPDATE ON public\.marketplace_transactions FROM authenticated/i);
    expect(sql).toMatch(/REVOKE UPDATE ON public\.marketplace_notifications FROM authenticated/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS .*listing.*photo.*ON storage\.objects/i);
    expect(sql).toMatch(/bucket_id = 'camflea-listings'/i);
    expect(sql).toMatch(/auth\.uid\(\)/i);
  });
});
