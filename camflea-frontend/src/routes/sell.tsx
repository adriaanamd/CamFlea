import { createFileRoute } from "@tanstack/react-router";
import { CamFleaApp } from "@/components/camflea-app";

export const Route = createFileRoute("/sell")({
  head: () => ({ meta: [
    { title: "Post an item · CamFlea" },
    { name: "description", content: "List a campus item for sale on CamFlea." },
    { property: "og:title", content: "Post an item · CamFlea" },
    { property: "og:description", content: "Give your campus finds a new home." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <CamFleaApp view="sell" />,
});