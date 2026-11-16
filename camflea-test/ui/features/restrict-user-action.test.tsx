import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RestrictUserAction } from "@/features/admin/restrict-user-action";
import { Button } from "@/components/ui/button";

describe("RestrictUserAction", () => {
  it("submits an indefinite restriction", () => {
    const onConfirm = vi.fn();

    render(
      <RestrictUserAction userName="A Student" onConfirm={onConfirm}>
        <Button>Restrict</Button>
      </RestrictUserAction>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Restrict" }));
    fireEvent.change(screen.getByRole("combobox", { name: /duration/i }), {
      target: { value: "indefinite" },
    });
    const confirmButtons = screen.getAllByRole("button", { name: /^restrict$/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]!);

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ restrictionExpiresAt: null }));
  });
});
