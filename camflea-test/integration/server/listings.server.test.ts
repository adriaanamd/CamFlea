import { describe, expect, it } from "vitest";
import { listingInsertForOwner } from "@/features/listings/listing-actions";

describe("listing server inputs", () => {
  it("binds seller identity to the authenticated owner and strips client ownership fields", () => {
    const insert = listingInsertForOwner("owner-1", {
      title: "Book",
      description: "Used",
      category: "Other",
      condition: "Good",
      meetingPlace: "Library",
      priceType: "hidden",
      price: 999,
      priceMin: null,
      priceMax: null,
      photos: [],
    });
    expect(insert.seller_id).toBe("owner-1");
    expect(insert.price).toBeNull();
  });

  it("rejects a single-price listing when the amount is missing", () => {
    expect(() =>
      listingInsertForOwner("owner-1", {
        title: "Book",
        description: "Used",
        category: "Other",
        condition: "Good",
        meetingPlace: "Library",
        priceType: "single",
        price: null,
        priceMin: null,
        priceMax: null,
        photos: [],
      }),
    ).toThrow(/price is required/i);
  });
});
