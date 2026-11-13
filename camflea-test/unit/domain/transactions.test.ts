import { describe, expect, it } from "vitest";

import { allowedTransactionActions } from "@/lib/domain/transactions";

describe("transaction actions", () => {
  it("gives buyers only the actions available in each state", () => {
    expect(allowedTransactionActions("cart", "buyer")).toEqual(["request", "cancel"]);
    expect(allowedTransactionActions("requested", "buyer")).toEqual(["cancel"]);
    expect(allowedTransactionActions("sent", "buyer")).toEqual(["received", "cancel"]);
    expect(allowedTransactionActions("received", "buyer")).toEqual(["cancel"]);
  });

  it("gives sellers only the actions available in each state", () => {
    expect(allowedTransactionActions("requested", "seller")).toEqual(["accept", "cancel"]);
    expect(allowedTransactionActions("sent", "seller")).toEqual(["cancel"]);
    expect(allowedTransactionActions("received", "seller")).toEqual(["complete", "cancel"]);
    expect(allowedTransactionActions("completed", "seller")).toEqual([]);
  });
});
