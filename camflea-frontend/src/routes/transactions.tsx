import { createFileRoute } from "@tanstack/react-router";
import { CamFleaApp } from "@/components/camflea-app";

export const Route = createFileRoute("/transactions")({
  head: () => ({ meta: [
    { title: "My transactions · CamFlea" },
    { name: "description", content: "Track your CamFlea cart, purchases, and completed campus hand-offs." },
    { property: "og:title", content: "My transactions · CamFlea" },
    { property: "og:description", content: "Follow every CamFlea purchase from request to hand-off." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <CamFleaApp view="transactions" />,
});