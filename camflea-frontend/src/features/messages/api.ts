import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuthContext = { supabase: SupabaseClient<Database>; userId: string };

const auth = [requireSupabaseAuth] as const;
export const listConversations = createServerFn({ method: "GET" })
  .middleware(auth)
  .handler(async ({ context }) => {
    const { createMessageService, createRepository } = await import("@/server/messages.server");
    const { supabase, userId } = context as AuthContext;
    return createMessageService(createRepository(supabase, userId)).listConversations();
  });
export const listThread = createServerFn({ method: "GET" })
  .middleware(auth)
  .validator((input: { participantId: string; listingId?: string }) => input)
  .handler(async ({ context, data }) => {
    const { createMessageService, createRepository } = await import("@/server/messages.server");
    const { supabase, userId } = context as AuthContext;
    return createMessageService(createRepository(supabase, userId)).listThread(data);
  });
export const sendMessage = createServerFn({ method: "POST" })
  .middleware(auth)
  .validator((input: unknown) => input)
  .handler(async ({ context, data }) => {
    const { createMessageService, createRepository } = await import("@/server/messages.server");
    const { supabase, userId } = context as AuthContext;
    return createMessageService(createRepository(supabase, userId)).sendMessage(data);
  });
export const markThreadRead = createServerFn({ method: "POST" })
  .middleware(auth)
  .validator((input: { threadId: string }) => input)
  .handler(async ({ context, data }) => {
    const { createMessageService, createRepository } = await import("@/server/messages.server");
    const { supabase, userId } = context as AuthContext;
    return createMessageService(createRepository(supabase, userId)).markThreadRead(data);
  });
