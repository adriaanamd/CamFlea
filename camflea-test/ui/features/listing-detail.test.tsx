import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListingDetail } from "@/features/listings/listing-detail";

describe("ListingDetail", () => {
  it("shows the item, price, meet-up location, and unavailable status", () => {
    render(
      <ListingDetail
        listing={{
          id: "1",
          title: "Calculus book",
          description: "Notes included",
          category: "Books & School Supplies",
          condition: "Good",
          meeting_place: "Library",
          photos: [],
          price_type: "hidden",
          price: null,
          price_min: null,
          price_max: null,
          status: "sold",
          seller_id: "seller",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Calculus book" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Price hidden")).toBeInTheDocument();
    expect(screen.getByText(/Library/)).toBeInTheDocument();
    expect(screen.getByText(/sold/i)).toBeInTheDocument();
  });
});
