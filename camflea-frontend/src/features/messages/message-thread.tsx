import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/integrations/supabase/types";

type Message = Tables<"marketplace_messages">;
export function MessageThread({
  participantName,
  listingTitle,
  messages,
  onSend,
  onBack,
  currentUserId,
}: {
  participantName: string;
  listingTitle?: string | undefined;
  messages: Message[];
  onSend: (body: string) => Promise<void>;
  onBack?: () => void;
  currentUserId?: string | undefined;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length]);
  const [body, setBody] = useState("");
  const [failedBody, setFailedBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const content = failedBody || body;
    if (!content.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSend(content);
      setBody("");
      setFailedBody("");
    } catch {
      setFailedBody(content);
      setError("Your message couldn't be sent. Check your connection and retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label={`Conversation with ${participantName}`} className="message-thread-panel">
      <header className="flex items-center gap-3 border-b p-4">
        {onBack && (
          <Button variant="ghost" size="icon" aria-label="Back to conversations" onClick={onBack}>
            <ArrowLeft />
          </Button>
        )}
        <div>
          <h2 className="font-semibold">{participantName}</h2>
          {listingTitle && <p className="text-sm text-muted-foreground">About {listingTitle}</p>}
        </div>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[85%] rounded-xl p-3 ${message.sender_id === currentUserId ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
            <time
              className={`text-xs ${message.sender_id === currentUserId ? "text-primary-foreground/80" : "text-muted-foreground"}`}
            >
              {new Date(message.created_at).toLocaleString()}
            </time>
          </article>
        ))}
      </div>
      <form className="message-compose" onSubmit={submit}>
        <Input
          aria-label="Message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4000}
          placeholder="Write a message"
        />
        <Button type="submit" aria-label="Send" disabled={busy}>
          <Send />
        </Button>
      </form>
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between px-3 pb-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void submit()}
          >
            Retry
          </Button>
        </div>
      )}
    </section>
  );
}
