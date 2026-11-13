import { createFileRoute } from "@tanstack/react-router";
import { CamFleaApp } from "@/components/camflea-app";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [
    { title: "Messages · CamFlea" },
    { name: "description", content: "Message students about CamFlea listings and campus meet-ups." },
    { property: "og:title", content: "Messages · CamFlea" },
    { property: "og:description", content: "Continue your CamFlea conversations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <CamFleaApp view="messages" />,
});