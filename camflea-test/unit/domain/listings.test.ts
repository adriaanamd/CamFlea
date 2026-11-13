import { describe, expect, it } from "vitest";

import { formatListingPrice } from "@/lib/domain/listings";

describe("listing price semantics", () => {
  it("formats a single PHP price", () => {
    expect(
      formatListingPrice({ priceType: "single", price: 1250, priceMin: null, priceMax: null }),
    ).toBe("₱1,250.00");
  });

  it("formats a PHP price range", () => {
    expect(
      formatListingPrice({ priceType: "range", price: null, priceMin: 500, priceMax: 900 }),
    ).toBe("₱500.00–₱900.00");
  });

  it("does not reveal a hidden price", () => {
    expect(
      formatListingPrice({ priceType: "hidden", price: null, priceMin: null, priceMax: null }),
    ).toBe("Price hidden");
  });
});
