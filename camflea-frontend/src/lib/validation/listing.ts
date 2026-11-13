import { z } from "zod";

import { LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/domain/listings";

const nullableNumber = z.number().finite().nonnegative().nullable().optional();

export const listingInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(120),
    description: z.string().trim().min(1, "Description is required.").max(5000),
    category: z.enum(LISTING_CATEGORIES),
    condition: z.enum(LISTING_CONDITIONS),
    meetingPlace: z.string().trim().min(1, "Meeting place is required.").max(160),
    priceType: z.enum(["single", "range", "hidden"]),
    price: nullableNumber,
    priceMin: nullableNumber,
    priceMax: nullableNumber,
    photos: z.array(z.string().trim().min(1)).max(5, "You can add up to five photos."),
  })
  .superRefine((value, context) => {
    if (value.priceType === "single" && value.price === null && value.price === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "Price is required." });
    }

    if (value.priceType === "range") {
      if (value.priceMin === null || value.priceMin === undefined) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["priceMin"], message: "Minimum price is required." });
      }
      if (value.priceMax === null || value.priceMax === undefined) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["priceMax"], message: "Maximum price is required." });
      }
      if (
        value.priceMin !== null &&
        value.priceMin !== undefined &&
        value.priceMax !== null &&
        value.priceMax !== undefined &&
        value.priceMin > value.priceMax
      ) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "Minimum price cannot be greater than maximum price." });
      }
    }
  });

export type ListingInput = z.infer<typeof listingInputSchema>;
