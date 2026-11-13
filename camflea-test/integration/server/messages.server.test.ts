import { describe, expect, it, vi } from "vitest";
import { createMessageService } from "@/server/messages.server";

describe("private message reads", () => {
  it("reads a thread only for an authenticated participant", async () => {
    const listParticipantMessages = vi.fn(async (participantId: string) => [
      {
        id: "00000000-0000-4000-8000-000000000003",
        sender_id: participantId,
        recipient_id: "00000000-0000-4000-8000-000000000004",
        body: "hello",
      },
    ]);
    const service = createMessageService({
      getUserId: async () => "participant",
      listParticipantMessages,
    } as never);

    await expect(
      service.listThread({
        participantId: "00000000-0000-4000-8000-000000000004",
      }),
    ).resolves.toHaveLength(1);
    expect(listParticipantMessages).toHaveBeenCalledWith(
      "participant",
      "00000000-0000-4000-8000-000000000004",
      undefined,
    );
  });
});

describe("message input validation", () => {
  it("rejects an attachment MIME type outside the supported image and video allowlist", async () => {
    const insertMessage = vi.fn();
    const service = createMessageService({
      getUserId: async () => "00000000-0000-4000-8000-000000000001",
      insertMessage,
    } as never);
    await expect(
      service.sendMessage({
        recipientId: "00000000-0000-4000-8000-000000000002",
        body: "See this",
        attachments: [
          { path: "private/file.svg", mimeType: "image/svg+xml", size: 120 },
        ],
      }),
    ).rejects.toThrow();
    expect(insertMessage).not.toHaveBeenCalled();
  });

  it("rejects message bodies over the server length limit", async () => {
    const insertMessage = vi.fn();
    const service = createMessageService({
      getUserId: async () => "00000000-0000-4000-8000-000000000001",
      insertMessage,
    } as never);
    await expect(
      service.sendMessage({
        recipientId: "00000000-0000-4000-8000-000000000002",
        body: "x".repeat(4001),
      }),
    ).rejects.toThrow();
    expect(insertMessage).not.toHaveBeenCalled();
  });
});
