import { describe, expect, it } from "vitest";

import { toClientError } from "@/lib/errors";

describe("client error mapping", () => {
  it("maps auth failures to stable safe copy", () => {
    expect(toClientError(new Error("Invalid login credentials"))).toEqual({
      code: "AUTH_INVALID",
      message: "Your email or password is incorrect.",
    });
  });

  it("does not expose database details for authorization failures", () => {
    expect(toClientError(new Error("new row violates row-level security policy"))).toEqual({
      code: "NOT_ALLOWED",
      message: "You are not allowed to do that.",
    });
  });
});
