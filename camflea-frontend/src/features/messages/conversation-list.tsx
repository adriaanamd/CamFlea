import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
type Message = Tables<"marketplace_messages">;
export type Conversation = {
  participantId: string;
  name: string;
  listingTitle?: string;
  messages: Message[];
};
export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Conversations" className="rounded-2xl border bg-card p-3">
      <h2 className="px-2 py-2 font-semibold">Conversations</h2>
      {conversations.length ? (
        conversations.map((conversation) => (
          <Button
            key={conversation.participantId}
            variant={selectedId === conversation.participantId ? "secondary" : "ghost"}
            className="mb-1 h-auto w-full justify-start whitespace-normal p-3 text-left"
            onClick={() => onSelect(conversation.participantId)}
          >
            <span>
              <strong className="block">{conversation.name}</strong>
              <span className="block truncate text-xs text-muted-foreground">
                {conversation.listingTitle ?? conversation.messages.at(-1)?.body ?? "Conversation"}
              </span>
            </span>
          </Button>
        ))
      ) : (
        <p className="p-2 text-sm text-muted-foreground">No conversations yet.</p>
      )}
    </nav>
  );
}
