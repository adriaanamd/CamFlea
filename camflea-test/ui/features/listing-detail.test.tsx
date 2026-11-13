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

  it("uses the resolved photo URL for the selected image and thumbnails", async () => {
    render(
      <ListingDetail
        listing={{
          id: "1",
          title: "Calculator",
          description: "Works well",
          category: "Books & School Supplies",
          condition: "Good",
          meeting_place: "Library",
          photos: ["https://cdn.example.test/calculator.png"],
          price_type: "single",
          price: 100,
          price_min: null,
          price_max: null,
          status: "available",
          seller_id: "seller",
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        }}
      />,
    );

    await screen.findByRole("img", { name: "Calculator photo 1" });
    const images = [...document.querySelectorAll("img")];
    expect(images).toHaveLength(2);
    expect(images.every((image) => image.getAttribute("src") === "https://cdn.example.test/calculator.png")).toBe(true);
  });
});
