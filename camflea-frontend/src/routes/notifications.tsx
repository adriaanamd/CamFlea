import { createFileRoute } from "@tanstack/react-router";
import { CamFleaApp } from "@/components/camflea-app";
import { CamFleaPageShell } from "@/components/camflea-page-shell";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [
    { title: "Notifications · CamFlea" },
    { name: "description", content: "See the latest updates about CamFlea listings and transactions." },
    { property: "og:title", content: "Notifications · CamFlea" },
    { property: "og:description", content: "The latest updates from your CamFlea marketplace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => (
    <CamFleaPageShell>
      <CamFleaApp view="notifications" />
    </CamFleaPageShell>
  ),
});
