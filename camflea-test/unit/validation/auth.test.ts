import { describe, expect, it } from "vitest";

import { authInputSchema } from "@/lib/validation/auth";

describe("auth input validation", () => {
  it("requires an approved campus email for signup", () => {
    expect(() =>
      authInputSchema.signup.parse({
        email: "student@example.com",
        password: "correct horse battery staple",
        firstName: "Ari",
        lastName: "Student",
      }),
    ).toThrow(/campus|email/i);
  });

  it("accepts a configured campus email", () => {
    expect(
      authInputSchema.signup.parse({
        email: "student@columban.edu.ph",
        password: "correct horse battery staple",
        firstName: "Ari",
        lastName: "Student",
      }).email,
    ).toBe("student@columban.edu.ph");
  });

  it("requires matching passwords for a password update", () => {
    expect(() =>
      authInputSchema.passwordUpdate.parse({
        password: "new password one",
        confirmPassword: "new password two",
      }),
    ).toThrow(/match/i);
  });
});
