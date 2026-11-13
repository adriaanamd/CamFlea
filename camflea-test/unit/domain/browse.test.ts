import { describe, expect, it } from "vitest";

import {
  browseCategories,
  browseConditions,
  formatListingPrice,
  filterAndSortListings,
  type BrowseListing,
} from "@/features/browse/domain";

const listings: BrowseListing[] = [
  {
    id: "book",
    title: "Calculus book",
    description: "Clean textbook",
    category: "books & school supplies",
    condition: "gently used",
    meeting_place: "Library",
    price_type: "single",
    price: 500,
    price_min: null,
    price_max: null,
    created_at: "2026-11-10T00:00:00.000Z",
  },
  {
    id: "shirt",
    title: "Campus jacket",
    description: "Warm and clean",
    category: "clothes & accessories",
    condition: "brand new",
    meeting_place: "Main gate",
    price_type: "range",
    price: null,
    price_min: 700,
    price_max: 900,
    created_at: "2026-11-12T00:00:00.000Z",
  },
  {
    id: "camera",
    title: "Film camera",
    description: "Good lens",
    category: "gadgets & electronics",
    condition: "heavily used",
    meeting_place: "Library",
    price_type: "hidden",
    price: null,
    price_min: null,
    price_max: null,
    created_at: "2026-11-11T00:00:00.000Z",
  },
];

describe("browse domain", () => {
  it("exposes the legacy category and condition values", () => {
    expect(browseCategories).toContain("sports & fitness");
    expect(browseCategories).toContain("instruments & recreations");
    expect(browseConditions).toEqual([
      "brand new",
      "gently used",
      "heavily used",
    ]);
  });

  it("searches all supported text fields before applying filters and sort", () => {
    expect(
      filterAndSortListings(listings, {
        query: "library",
        category: "all",
        condition: "all",
        sort: "price-low",
      }).map(({ id }) => id),
    ).toEqual(["book", "camera"]);
  });

  it("sorts numeric prices and keeps hidden prices after priced listings", () => {
    expect(
      filterAndSortListings(listings, {
        query: "",
        category: "all",
        condition: "all",
        sort: "price-high",
      }).map(({ id }) => id),
    ).toEqual(["shirt", "book", "camera"]);
  });

  it("formats single, range, and hidden prices without exposing a hidden amount", () => {
    expect(formatListingPrice(listings[0]!)).toMatch(/₱.*500/);
    expect(formatListingPrice(listings[1]!)).toMatch(/₱.*700.*₱.*900/);
    expect(formatListingPrice(listings[2]!)).toBe("Price hidden");
  });
});
