import { createFileRoute } from "@tanstack/react-router";
import { AdminReportQueue } from "@/features/admin/report-queue";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin desk · CamFlea" },
      {
        name: "description",
        content: "Review marketplace activity and community reports in CamFlea.",
      },
      { property: "og:title", content: "Admin desk · CamFlea" },
      { property: "og:description", content: "CamFlea marketplace safety and report review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminReportQueue,
});
