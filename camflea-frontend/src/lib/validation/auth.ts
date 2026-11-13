import { z } from "zod";

const password = z.string().min(8, "Password must be at least 8 characters.");

const campusEmail = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .refine((value) => value.toLowerCase().endsWith("@columban.edu.ph"), "Use your campus email address.");

const matchingPasswords = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords must match." });
    }
  });

export const authInputSchema = {
  signin: z.object({ email: z.string().trim().email(), password }),
  signup: z.object({
    email: campusEmail,
    password,
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
  }),
  recovery: z.object({ email: z.string().trim().email() }),
  passwordUpdate: matchingPasswords(z.object({ password, confirmPassword: password })),
};
