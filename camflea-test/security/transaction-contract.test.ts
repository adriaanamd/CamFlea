import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "../camflea-supabase/migrations/20261113090000_camflea_mvp_hardening.sql",
);

describe("transaction authorization contract", () => {
  it("locks the transaction and listing before deciding a transition", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toMatch(/marketplace_transition_transaction/i);
    expect(sql).toMatch(/FOR UPDATE/i);
    expect(sql).toMatch(/auth\.uid\(\)/i);
    expect(sql).toMatch(/invalid.*transition|not allowed/i);
  });
});
