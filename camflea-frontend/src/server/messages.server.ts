import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Tables } from "@/integrations/supabase/types";

const attachmentSchema = z.object({
  path: z.string().min(1).max(500),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4"]),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});
const sendSchema = z
  .object({
    recipientId: z.string().uuid(),
    listingId: z.string().uuid().optional(),
    body: z.string().trim().max(2000),
    attachments: z.array(attachmentSchema).max(5).default([]),
  })
  .refine((value) => value.body.length > 0 || value.attachments.length > 0, {
    message: "Write a message or attach a file.",
  });
const threadSchema = z.object({
  participantId: z.string().uuid(),
  listingId: z.string().uuid().optional(),
});
const readSchema = z.object({
  senderId: z.string().uuid(),
  listingId: z.string().uuid().optional(),
});

type MessageRow = Tables<"marketplace_messages">;
type MessageAttachment = z.infer<typeof attachmentSchema>;

export type MessageRepository = {
  getUserId: () => Promise<string | null>;
  listParticipantMessages: (
    actorId: string,
    participantId: string,
    listingId?: string,
  ) => Promise<MessageRow[]>;
  listConversations: (actorId: string) => Promise<MessageRow[]>;
  listingBelongsToRecipient: (listingId: string, recipientId: string) => Promise<boolean>;
  insertMessage: (
    row: Pick<MessageRow, "sender_id" | "recipient_id" | "listing_id" | "body" | "attachments">,
  ) => Promise<MessageRow>;
  markRecipientMessagesRead: (
    senderId: string,
    recipientId: string,
    listingId?: string,
  ) => Promise<void>;
};

export function createMessageService(repository: MessageRepository) {
  async function actor() {
    const id = await repository.getUserId();
    if (!id) throw new Error("Unauthorized");
    return id;
  }

  return {
    async listConversations() {
      return repository.listConversations(await actor());
    },
    async listThread(input: { participantId: string; listingId?: string }) {
      const userId = await actor();
      const thread = threadSchema.parse(input);
      if (thread.participantId === userId) throw new Error("Invalid conversation participant");
      return repository.listParticipantMessages(userId, thread.participantId, thread.listingId);
    },
    async sendMessage(input: unknown) {
      const userId = await actor();
      const message = sendSchema.parse(input);
      if (message.recipientId === userId) throw new Error("Cannot message yourself");
      if (
        message.listingId &&
        !(await repository.listingBelongsToRecipient(message.listingId, message.recipientId))
      ) {
        throw new Error("Listing context does not match recipient");
      }
      return repository.insertMessage({
        sender_id: userId,
        recipient_id: message.recipientId,
        listing_id: message.listingId ?? null,
        body: message.body,
        attachments: message.attachments.map((attachment: MessageAttachment) => attachment.path),
      });
    },
    async markThreadRead(input: { senderId: string; listingId?: string }) {
      const userId = await actor();
      const read = readSchema.parse(input);
      return repository.markRecipientMessagesRead(read.senderId, userId, read.listingId);
    },
  };
}

export function createRepository(
  client: SupabaseClient<Database>,
  userId: string,
): MessageRepository {
  return {
    getUserId: async () => userId,
    listParticipantMessages: async (actorId, participantId, listingId) => {
      let query = client
        .from("marketplace_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${actorId},recipient_id.eq.${participantId}),and(sender_id.eq.${participantId},recipient_id.eq.${actorId})`,
        )
        .order("created_at", { ascending: true });
      if (listingId) query = query.eq("listing_id", listingId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    listConversations: async (actorId) => {
      const { data, error } = await client
        .from("marketplace_messages")
        .select("*")
        .or(`sender_id.eq.${actorId},recipient_id.eq.${actorId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    listingBelongsToRecipient: async (listingId, recipientId) => {
      const { data, error } = await client
        .from("marketplace_listings")
        .select("id")
        .eq("id", listingId)
        .eq("seller_id", recipientId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    insertMessage: async (row) => {
      const { data, error } = await client.rpc("marketplace_send_message", {
        _recipient_id: row.recipient_id,
        ...(row.listing_id ? { _listing_id: row.listing_id } : {}),
        _body: row.body,
        _attachments: row.attachments,
      });
      if (error) throw error;
      if (!data) throw new Error("Message was not created.");
      const now = new Date().toISOString();
      return {
        id: data,
        sender_id: userId,
        recipient_id: row.recipient_id,
        listing_id: row.listing_id,
        body: row.body,
        attachments: row.attachments,
        is_read: false,
        created_at: now,
        updated_at: now,
      };
    },
    markRecipientMessagesRead: async (senderId, recipientId, listingId) => {
      const { error } = await client.rpc("marketplace_mark_thread_read", {
        _sender_id: senderId,
        ...(listingId ? { _listing_id: listingId } : {}),
      });
      if (error) throw error;
    },
  };
}
