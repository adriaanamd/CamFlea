import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AccountStatusProvider,
  useAccountStatus,
} from "@/components/account-status-context";

function Probe() {
  const account = useAccountStatus();
  return <output>{account.status}:{String(account.canUseMarketplace)}</output>;
}

describe("account status context", () => {
  it("exposes the effective status to child controls", () => {
    render(
      <AccountStatusProvider
        value={{
          status: "restricted",
          reason: null,
          restrictionExpiresAt: null,
          warningCount: 1,
        }}
      >
        <Probe />
      </AccountStatusProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("restricted:false");
  });
});
