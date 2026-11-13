import { createFileRoute } from "@tanstack/react-router";
import { CamFleaApp } from "@/components/camflea-app";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "My profile · CamFlea" },
    { name: "description", content: "Manage the student profile connected to your CamFlea account." },
    { property: "og:title", content: "My profile · CamFlea" },
    { property: "og:description", content: "Your student profile on CamFlea." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <CamFleaApp view="profile" />,
});