import { describe, expect, it } from "vitest";
import { profileUpdateForOwner } from "@/server/profile.server";

describe("profile server inputs", () => {
  it("keeps profile updates limited to editable student fields", () => {
    const update = profileUpdateForOwner({
      firstName: "Ari",
      lastName: "Student",
      school: "Columban College",
      program: "Computer Science",
      yearLevel: "2nd year",
      bio: "I like useful finds.",
      email: "forged@example.com",
      isBanned: true,
    } as never);

    expect(update).toEqual({
      first_name: "Ari",
      last_name: "Student",
      school: "Columban College",
      program: "Computer Science",
      year_level: "2nd year",
      bio: "I like useful finds.",
    });
    expect(update).not.toHaveProperty("email");
    expect(update).not.toHaveProperty("is_banned");
  });
});
