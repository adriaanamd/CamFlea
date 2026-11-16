import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  path.resolve(process.cwd(), "../camflea-supabase/migrations/20261116130000_user_moderation_controls.sql"),
  "utf8",
);

describe("listing moderation enforcement", () => {
  it("requires active status for listing and media writes", () => {
    expect((sql.match(/marketplace_effective_account_status\(auth\.uid\(\)\) = 'active'/gi) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(sql).toMatch(/storage\.foldername\(name\)[\s\S]*marketplace_effective_account_status\(auth\.uid\(\)\)/i);
  });
});
