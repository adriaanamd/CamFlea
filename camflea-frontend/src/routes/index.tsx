import { createFileRoute } from "@tanstack/react-router";

import { CamFleaApp } from "@/components/camflea-app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CamFlea — Campus Marketplace" },
      { name: "description", content: "Browse, buy, and sell campus finds with the CamFlea student community." },
      { property: "og:title", content: "CamFlea — Campus Marketplace" },
      { property: "og:description", content: "Browse, buy, and sell campus finds with the CamFlea student community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <CamFleaApp view="browse" />,
});