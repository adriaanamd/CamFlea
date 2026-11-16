import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountStatusBanner } from "@/components/account-status-banner";

describe("AccountStatusBanner", () => {
  it("explains a timed restriction", () => {
    render(
      <AccountStatusBanner
        status="restricted"
        restrictionExpiresAt="2026-12-01T12:00:00.000Z"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/cannot post, message, or purchase/i);
    expect(screen.getByRole("status")).toHaveTextContent(/Dec 1, 2026/i);
  });

  it("explains when an indefinite restriction needs administrator restoration", () => {
    render(<AccountStatusBanner status="restricted" restrictionExpiresAt={null} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /until an administrator restores your account/i,
    );
  });
});
