import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BannedAccountModal } from "@/components/banned-account-modal";

describe("BannedAccountModal", () => {
  it("renders the blocking banned modal and signs out", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);

    render(<BannedAccountModal onSignOut={signOut} />);

    expect(
      screen.getByRole("dialog", { name: /you are banned from camflea/i }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
