import { describe, expect, it } from "vitest";
import {
  listingInsertForOwner,
  listingMediaRowsForOwner,
} from "@/features/listings/listing-actions";

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

  it("creates ordered private-media records from uploaded photo metadata", () => {
    expect(
      listingMediaRowsForOwner("listing-1", [
        { path: "owner-1/listing-1/first.png", mimeType: "image/png", byteSize: 1200 },
        { path: "owner-1/listing-1/second.jpg", mimeType: "image/jpeg", byteSize: 2400 },
      ]),
    ).toEqual([
      {
        listing_id: "listing-1",
        storage_path: "owner-1/listing-1/first.png",
        ordering: 0,
        mime_type: "image/png",
        byte_size: 1200,
        upload_status: "ready",
      },
      {
        listing_id: "listing-1",
        storage_path: "owner-1/listing-1/second.jpg",
        ordering: 1,
        mime_type: "image/jpeg",
        byte_size: 2400,
        upload_status: "ready",
      },
    ]);
  });
});
