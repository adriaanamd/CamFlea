import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const appPath = path.resolve(process.cwd(), "../camflea-frontend/src/components/camflea-app.tsx");

describe("student profile REST projections", () => {
  it("never requests the email column from the client-side profile table", () => {
    const source = readFileSync(appPath, "utf8");

    expect(source).not.toMatch(/from\("student_profiles"\)\.select\("\*"\)/);
    expect(source).not.toMatch(/select\("user_id, email,/);
  });
});
