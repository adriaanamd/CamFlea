import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListingForm } from "@/features/listings/listing-form";

describe("ListingForm", () => {
  it("requires valid listing details and emits hidden-price listings without numeric values", async () => {
    const save = vi.fn();
    render(<ListingForm onSave={save} />);
    fireEvent.change(screen.getByLabelText(/item name/i), {
      target: { value: "Notebook" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Unused notes" },
    });
    fireEvent.change(screen.getByLabelText(/meet-up place/i), {
      target: { value: "Library" },
    });
    fireEvent.click(screen.getByRole("button", { name: /post item/i }));
    expect(
      await screen.findByText(/category is required/i),
    ).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
});
