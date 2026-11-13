import { describe, expect, it, vi } from "vitest";
import { createMessageService } from "@/server/messages.server";

describe("message privacy", () => {
  it("derives sender and read recipient from the authenticated user", async () => {
    const insertMessage = vi.fn(async (row) => ({ id: "m1", ...row }));
    const markRecipientMessagesRead = vi.fn(async () => {});
    const service = createMessageService({
      getUserId: async () => "actor",
      listingBelongsToRecipient: async () => true,
      insertMessage,
      markRecipientMessagesRead,
    } as never);

    await service.sendMessage({
      senderId: "forged",
      recipientId: "00000000-0000-4000-8000-000000000001",
      body: "Hi",
    });
    await service.markThreadRead({
      threadId: "00000000-0000-4000-8000-000000000005",
      recipientId: "forged",
    } as never);
    expect(insertMessage.mock.calls[0]?.[0].sender_id).toBe("actor");
    expect(markRecipientMessagesRead).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000005",
      "actor",
    );
  });
});
