import { describe, expect, it } from "vitest";

import { listingInputSchema } from "@/lib/validation/listing";

const validListing = {
  title: "Calculus textbook",
  description: "Used for one semester.",
  category: "Books & School Supplies",
  condition: "Good",
  meetingPlace: "Library entrance",
  priceType: "single",
  price: 250,
  photos: [],
};

describe("listing input validation", () => {
  it("accepts a single non-negative price", () => {
    expect(listingInputSchema.parse(validListing).price).toBe(250);
  });

  it("rejects a range where the minimum is greater than the maximum", () => {
    expect(() =>
      listingInputSchema.parse({
        ...validListing,
        priceType: "range",
        price: null,
        priceMin: 900,
        priceMax: 500,
      }),
    ).toThrow(/price/i);
  });

  it("accepts hidden price without numeric values", () => {
    expect(
      listingInputSchema.parse({ ...validListing, priceType: "hidden", price: null }).priceType,
    ).toBe("hidden");
  });

  it("rejects more than five listing photos", () => {
    expect(() =>
      listingInputSchema.parse({ ...validListing, photos: ["1", "2", "3", "4", "5", "6"] }),
    ).toThrow(/photos/i);
  });
});
