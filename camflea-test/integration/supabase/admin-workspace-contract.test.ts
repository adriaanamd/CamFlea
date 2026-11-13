import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "../camflea-supabase/migrations/20261113120000_admin_workspace.sql",
);

describe("admin workspace database contract", () => {
  it("defines exact-admin data and mutation boundaries", () => {
    expect(existsSync(migrationPath)).toBe(true);
    if (!existsSync(migrationPath)) return;

    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toMatch(/warning_count/i);
    expect(sql).toMatch(/is_pinned/i);
    expect(sql).toMatch(/is_verified/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.admin_list_student_profiles/i);
    expect(sql).toMatch(/auth_user\.email::TEXT/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.admin_warn_user/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.admin_set_account_status/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.admin_set_listing_flags/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.admin_delete_listing/i);
    expect((sql.match(/public\.has_role\(auth\.uid\(\),\s*'admin'\)/gi) ?? []).length).toBeGreaterThanOrEqual(5);
    expect((sql.match(/marketplace_audit_log/gi) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.admin_list_student_profiles\(\) TO authenticated/i);
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.admin_list_student_profiles\(\) FROM PUBLIC, anon/i);
  });
});
