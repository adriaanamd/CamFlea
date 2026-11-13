import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { listConversations, listThread, markThreadRead, sendMessage } from "./api";
import { ConversationList, type Conversation } from "./conversation-list";
import { MessageThread } from "./message-thread";
import { refreshOnMessageEvent } from "./realtime";
type Message = Tables<"marketplace_messages">;
export function MessagePage() {
  const [rows, setRows] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [listingTitles, setListingTitles] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState("");
  const [selected, setSelected] = useState("");
  const [mobileThread, setMobileThread] = useState(false);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      const messages = await listConversations();
      setRows(messages);
      setError("");
    } catch {
      setError("Unable to load your conversations. Please retry.");
    }
  }, []);
  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (alive) setUserId(data.user?.id ?? "");
    });
    void reload();
    return () => {
      alive = false;
    };
  }, [reload]);
  const conversations = useMemo(() => {
    const map = new Map<string, Message[]>();
    for (const row of rows) {
      const other = row.sender_id === userId ? row.recipient_id : row.sender_id;
      map.set(other, [...(map.get(other) ?? []), row]);
    }
    return [...map].map(([participantId, messages]) => {
      const listingId = [...messages].reverse().find((row) => row.listing_id)?.listing_id;
      const conversation: Conversation = {
        participantId,
        name: profiles[participantId] ?? "Campus student",
        messages,
      };
      if (listingId) {
        return {
          ...conversation,
          listingTitle: listingTitles[listingId] ?? "Listing unavailable",
        };
      }
      return conversation;
    });
  }, [rows, userId, profiles, listingTitles]);
  useEffect(() => {
    if (!selected && conversations.length) setSelected(conversations[0]!.participantId);
  }, [selected, conversations]);
  const conversation = conversations.find((item) => item.participantId === selected);
  const listingId =
    rows.find((row) => row.sender_id === selected || row.recipient_id === selected)?.listing_id ??
    undefined;
  const refreshThread = useCallback(async () => {
    if (!selected || !userId) return;
    const thread = await listThread({
      data: listingId ? { participantId: selected, listingId } : { participantId: selected },
    });
    setRows((current) => [
      ...current.filter((row) => !thread.some((item) => item.id === row.id)),
      ...thread,
    ]);
    const unread = thread.filter((row) => row.recipient_id === userId && !row.is_read);
    await Promise.all(unread.map((row) => markThreadRead({ data: { threadId: row.id } })));
  }, [selected, userId, listingId]);
  useEffect(() => {
    if (!selected) return;
    void refreshThread();
    const channel = supabase
      .channel(`messages-${selected}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_messages" },
        refreshOnMessageEvent(() => {
          void refreshThread();
        }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selected, refreshThread]);
  async function submit(body: string) {
    if (!selected) return;
    await sendMessage({
      data: {
        recipientId: selected,
        listingId: conversation?.messages.find((row) => row.listing_id)?.listing_id ?? undefined,
        body,
        attachments: [],
      },
    });
    await reload();
  }
  useEffect(() => {
    const ids = [...new Set(rows.flatMap((row) => [row.sender_id, row.recipient_id]))].filter(
      (id) => id !== userId,
    );
    if (!ids.length) return;
    void supabase
      .from("student_profiles")
      .select("user_id,first_name,last_name")
      .in("user_id", ids)
      .then(({ data }) =>
        setProfiles(
          Object.fromEntries(
            (data ?? []).map((p) => [p.user_id, `${p.first_name} ${p.last_name}`.trim()]),
          ),
        ),
      );
  }, [rows, userId]);
  useEffect(() => {
    const ids = [
      ...new Set(rows.map((row) => row.listing_id).filter((id): id is string => Boolean(id))),
    ];
    if (!ids.length) return;
    void supabase
      .from("marketplace_listings")
      .select("id,title")
      .in("id", ids)
      .then(({ data }) =>
        setListingTitles(
          Object.fromEntries((data ?? []).map((listing) => [listing.id, listing.title])),
        ),
      );
  }, [rows]);
  return (
    <main className="messages-page content-view">
      <header className="page-heading content-heading">
        <div>
          <p className="eyebrow">BETTER DEALS START WITH A NOTE</p>
          <h1>Messages</h1>
          <p className="page-intro">Ask a question, find a meet-up time, make it easy.</p>
        </div>
      </header>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => void reload()}>Retry</button>
        </div>
      )}
      <div className="message-grid">
        <div className={mobileThread && selected ? "hidden md:block" : "block"}>
          <ConversationList
            conversations={conversations}
            selectedId={selected}
            onSelect={(id) => {
              setSelected(id);
              setMobileThread(true);
            }}
          />
        </div>
        {conversation && (
          <div className={mobileThread ? "block" : "hidden md:block"}>
            <MessageThread
              participantName={conversation.name}
              {...(conversation.listingTitle ? { listingTitle: conversation.listingTitle } : {})}
              messages={conversation.messages}
              onBack={() => setMobileThread(false)}
              onSend={submit}
            />
          </div>
        )}
      </div>
    </main>
  );
}
