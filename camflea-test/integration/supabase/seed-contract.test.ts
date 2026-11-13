import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const seedPath = path.resolve(process.cwd(), "../camflea-supabase/seed.sql");
const gitignorePath = path.resolve(process.cwd(), "../.gitignore");

describe("CamFlea demo seed contract", () => {
  it("defines at least 12 demo users and 120 demo listings", () => {
    if (!existsSync(seedPath)) {
      expect(existsSync(seedPath)).toBe(true);
      return;
    }

    const sql = readFileSync(seedPath, "utf8");
    const userSection = sql.match(/-- DEMO USERS BEGIN([\s\S]*?)-- DEMO USERS END/)?.[1] ?? "";
    const listingSection =
      sql.match(/-- DEMO LISTINGS BEGIN([\s\S]*?)-- DEMO LISTINGS END/)?.[1] ?? "";
    const userIds = userSection.match(/10000000-0000-0000-0000-0000000000\d{2}/g) ?? [];
    const listingIds =
      listingSection.match(/20000000-0000-0000-0000-000000000(?:0\d{2}|1[01]\d|120)/g) ?? [];

    expect(new Set(userIds).size).toBeGreaterThanOrEqual(12);
    expect(new Set(listingIds).size).toBeGreaterThanOrEqual(120);
    expect(sql).toMatch(/\[DEMO DATA\]/);
    expect(sql).toMatch(/CREATE TEMP TABLE seed_demo_user_map/i);
    expect(sql).toMatch(/JOIN auth\.users AS auth_user ON auth_user\.email = seed\.email/i);
    expect(sql).not.toMatch(/INSERT INTO auth\.users/i);
    expect(sql).not.toMatch(/INSERT INTO auth\.identities/i);
    expect(sql).toMatch(/@camflea\.com/);
    expect(sql).not.toMatch(/@camflea\.test/);

    const gitignore = readFileSync(gitignorePath, "utf8");
    expect(gitignore).toContain("camflea-supabase/seed-credentials.local.md");
  });
});
