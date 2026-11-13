import { createFileRoute } from "@tanstack/react-router";
import { MessagePage } from "@/features/messages/message-page";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages · CamFlea" },
      { name: "description", content: "Continue private CamFlea conversations." },
    ],
  }),
  component: MessagePage,
});
