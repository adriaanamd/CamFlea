import { createFileRoute } from "@tanstack/react-router";
import { CamFleaApp } from "@/components/camflea-app";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · CamFlea" },
      {
        name: "description",
        content: "Sign in or create your CamFlea campus marketplace account.",
      },
      { property: "og:title", content: "Sign in · CamFlea" },
      { property: "og:description", content: "Join the CamFlea campus marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <CamFleaApp view="auth" />,
});
