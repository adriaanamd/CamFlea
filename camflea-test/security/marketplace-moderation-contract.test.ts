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

  it("guards purchase initiation with effective status", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.marketplace_add_to_cart[\s\S]*marketplace_effective_account_status\(auth\.uid\(\)\) <> 'active'/i);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.marketplace_request_purchase[\s\S]*marketplace_effective_account_status\(auth\.uid\(\)\) <> 'active'/i);
  });

  it("guards message sending with effective status", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.marketplace_send_message[\s\S]*marketplace_effective_account_status\(auth\.uid\(\)\) <> 'active'/i);
  });
});
