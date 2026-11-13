import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";

import { BrowsePage } from "@/features/browse/browse-page";
import type { BrowsePageData } from "@/features/browse/browse-page";

const data: BrowsePageData = {
  listings: [
    {
      id: "book-1",
      title: "Calculus book",
      description: "Clean textbook",
      category: "books & school supplies",
      condition: "gently used",
      meeting_place: "Library",
      price_type: "single",
      price: 500,
      price_min: null,
      price_max: null,
      photos: [],
      seller_id: "seller-1",
      status: "available",
      created_at: "2026-11-10T00:00:00.000Z",
      updated_at: "2026-11-10T00:00:00.000Z",
    },
  ],
  sellers: { "seller-1": { name: "Alex Student", school: "Campus" } },
};

describe("BrowsePage", () => {
  it("loads real listing cards and filters them by search text", async () => {
    const loadListings = vi.fn().mockResolvedValue(data);
    render(<BrowsePage loadListings={loadListings} />);

    expect(
      await screen.findByRole("link", { name: /Calculus book/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alex Student")).toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search listings" }),
      {
        target: { value: "nonexistent" },
      },
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("link", { name: /Calculus book/i }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/No listings match/)).toBeInTheDocument();
  });
});
