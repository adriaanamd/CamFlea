import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { LandingPage, type LandingListing } from "@/features/browse/landing-page";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

function renderLandingPage(element: ReactNode) {
  return render(element);
}

const sampleListings: LandingListing[] = [
  {
    id: "listing-calc-1",
    title: "Casio FX-991EX Scientific Calculator",
    description: "Solar and battery powered calculator for engineering exams.",
    category: "Books & School Supplies",
    condition: "Like new",
    meeting_place: "Engineering building atrium",
    price_type: "single",
    price: 1150,
    price_min: null,
    price_max: null,
    photos: [],
    seller_id: "seller-1",
    status: "available",
    is_pinned: true,
    is_verified: true,
    created_at: "2026-11-15T08:00:00.000Z",
    updated_at: "2026-11-15T08:00:00.000Z",
  },
  {
    id: "listing-kb-2",
    title: "Keychron K2 Wireless Mechanical Keyboard",
    description: "Hot-swappable tactile switches with white backlight.",
    category: "Gadgets & Electronics",
    condition: "Good",
    meeting_place: "Main Library lobby",
    price_type: "range",
    price: null,
    price_min: 2200,
    price_max: 2600,
    photos: [],
    seller_id: "seller-2",
    status: "available",
    is_pinned: false,
    is_verified: true,
    created_at: "2026-11-14T08:00:00.000Z",
    updated_at: "2026-11-14T08:00:00.000Z",
  },
  {
    id: "listing-jacket-3",
    title: "Varsity Corduroy Jacket",
    description: "Warm medium-sized jacket for morning lectures.",
    category: "Clothes & Accessories",
    condition: "New",
    meeting_place: "Student Union entrance",
    price_type: "single",
    price: 890,
    price_min: null,
    price_max: null,
    photos: [],
    seller_id: "seller-3",
    status: "available",
    is_pinned: false,
    is_verified: false,
    created_at: "2026-11-13T08:00:00.000Z",
    updated_at: "2026-11-13T08:00:00.000Z",
  },
];

describe("LandingPage e-commerce storefront", () => {
  it("renders the storefront catalog, department filters, and product cards with prices and meet-up spots", async () => {
    const loadListings = vi.fn().mockResolvedValue(sampleListings);

    renderLandingPage(<LandingPage loadListings={loadListings} />);

    expect(
      await screen.findByText("Keychron K2 Wireless Mechanical Keyboard"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Casio FX-991EX Scientific Calculator").length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Varsity Corduroy Jacket")).toBeInTheDocument();

    expect(screen.getAllByText(/₱1,150\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Engineering building atrium/i).length).toBeGreaterThan(0);
  });

  it("filters storefront products by search query and department category", async () => {
    const loadListings = vi.fn().mockResolvedValue(sampleListings);

    renderLandingPage(<LandingPage loadListings={loadListings} />);

    await screen.findByText("Keychron K2 Wireless Mechanical Keyboard");

    const deptNav = screen.getByLabelText("Marketplace departments");
    fireEvent.click(within(deptNav).getByText("Gadgets & Electronics"));

    await waitFor(() => {
      expect(screen.queryByText("Varsity Corduroy Jacket")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Keychron K2 Wireless Mechanical Keyboard")).toBeInTheDocument();

    fireEvent.click(within(deptNav).getByText("All Departments"));

    const searchInput = screen.getByLabelText("Search campus marketplace");
    fireEvent.change(searchInput, { target: { value: "Corduroy" } });

    await waitFor(() => {
      expect(
        screen.queryByText("Keychron K2 Wireless Mechanical Keyboard"),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Varsity Corduroy Jacket")).toBeInTheDocument();
  });

  it("opens the product quick-view modal with full details and sign-in purchase actions", async () => {
    const loadListings = vi.fn().mockResolvedValue(sampleListings);

    renderLandingPage(<LandingPage loadListings={loadListings} />);

    await screen.findByText("Keychron K2 Wireless Mechanical Keyboard");

    fireEvent.click(
      screen.getByLabelText("Quick view Casio FX-991EX Scientific Calculator"),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Solar and battery powered calculator for engineering exams/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: /Sign in to add to cart/i }),
    ).toHaveAttribute("href", "/auth");

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("filters by campus meet-up spot and condition, and recovers when filters match nothing", async () => {
    const loadListings = vi.fn().mockResolvedValue(sampleListings);

    renderLandingPage(<LandingPage loadListings={loadListings} />);

    await screen.findByText("Keychron K2 Wireless Mechanical Keyboard");

    fireEvent.change(screen.getByLabelText("Filter by meet-up spot"), {
      target: { value: "Main Library lobby" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Varsity Corduroy Jacket")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Keychron K2 Wireless Mechanical Keyboard")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter by condition"), {
      target: { value: "New" },
    });

    expect(
      await screen.findByText("No listings match your current filters"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Reset all filters"));

    expect(await screen.findByText("Varsity Corduroy Jacket")).toBeInTheDocument();
  });

  it("shows a recoverable error state when loading fails and retries", async () => {
    const loadListings = vi
      .fn<() => Promise<LandingListing[]>>()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce(sampleListings);

    renderLandingPage(<LandingPage loadListings={loadListings} />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/Could not load live listings/i)).toBeInTheDocument();

    fireEvent.click(within(alert).getByText("Try again"));

    expect(
      await screen.findByText("Keychron K2 Wireless Mechanical Keyboard"),
    ).toBeInTheDocument();
  });
});
