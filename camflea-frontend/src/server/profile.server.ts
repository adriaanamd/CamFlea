import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  school: optionalText(160),
  program: optionalText(160),
  yearLevel: optionalText(80),
  bio: optionalText(1000),
});

export function profileUpdateForOwner(input: unknown) {
  const value = profileUpdateSchema.parse(input);
  return {
    first_name: value.firstName,
    last_name: value.lastName,
    school: value.school || null,
    program: value.program || null,
    year_level: value.yearLevel || null,
    bio: value.bio || null,
  };
}

