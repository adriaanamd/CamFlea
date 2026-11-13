import { useState, type FormEvent } from "react";
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
}: {
  participantName: string;
  listingTitle?: string;
  messages: Message[];
  onSend: (body: string) => Promise<void>;
  onBack?: () => void;
}) {
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
    <section
      aria-label={`Conversation with ${participantName}`}
      className="flex min-h-[24rem] flex-col rounded-2xl border bg-card"
    >
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
          <article key={message.id} className="max-w-[85%] rounded-xl bg-muted p-3">
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
            <time className="text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleString()}
            </time>
          </article>
        ))}
      </div>
      <form className="flex gap-2 border-t p-3" onSubmit={submit}>
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
