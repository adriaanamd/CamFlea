import { createFileRoute } from "@tanstack/react-router";

import { LandingPage } from "@/features/browse/landing-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CamFlea — Campus Marketplace" },
      {
        name: "description",
        content: "The student marketplace for your campus. Sign in to buy, sell, and chat.",
      },
      { property: "og:title", content: "CamFlea — Campus Marketplace" },
      {
        property: "og:description",
        content: "The student marketplace for your campus. Sign in to buy, sell, and chat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <LandingPage />,
});
