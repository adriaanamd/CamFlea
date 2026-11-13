import { describe, expect, it, vi } from "vitest";
import { createMessageService } from "@/server/messages.server";

describe("listing-linked messages", () => {
  it("rejects a listing unless its seller is the selected recipient", async () => {
    const insertMessage = vi.fn();
    const service = createMessageService({
      getUserId: async () => "buyer",
      listingBelongsToRecipient: async () => false,
      insertMessage,
    } as never);

    await expect(
      service.sendMessage({
        recipientId: "00000000-0000-4000-8000-000000000001",
        listingId: "00000000-0000-4000-8000-000000000002",
        body: "Interested",
      }),
    ).rejects.toThrow("Listing context");
    expect(insertMessage).not.toHaveBeenCalled();
  });
});
