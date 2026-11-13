import { describe, expect, it } from "vitest";

import { canTakeTransactionAction, formatPeso } from "@/lib/camflea-workflow";

describe("CamFlea transaction milestones", () => {
  it("allows only each participant milestone from the expected state", () => {
    expect(canTakeTransactionAction("cart", "request")).toBe(true);
    expect(canTakeTransactionAction("requested", "accept")).toBe(true);
    expect(canTakeTransactionAction("sent", "received")).toBe(true);
    expect(canTakeTransactionAction("received", "complete")).toBe(true);
    expect(canTakeTransactionAction("completed", "cancel")).toBe(false);
    expect(canTakeTransactionAction("cancelled", "request")).toBe(false);
  });

  it("formats prices as Philippine pesos and keeps private prices hidden", () => {
    expect(formatPeso(1250)).toBe("₱1,250.00");
    expect(formatPeso(null)).toBe("Price hidden");
  });
});