import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("CamFlea accessibility foundation", () => {
  it("defines visible focus and reduced-motion behavior", () => {
    const css = readFileSync(path.resolve(process.cwd(), "src/styles.css"), "utf8");

    expect(css).toMatch(/prefers-reduced-motion/i);
    expect(css).toMatch(/focus-visible/i);
    expect(css).toMatch(/#069210/i);
    expect(css).toMatch(/Fraunces/i);
    expect(css).toMatch(/Epilogue/i);
  });
});
