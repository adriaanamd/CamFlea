import { createFileRoute } from "@tanstack/react-router";

import { BrowsePage } from "@/features/browse/browse-page";
import { CamFleaPageShell } from "@/components/camflea-page-shell";
import { supabase } from "@/integrations/supabase/client";

async function loadBrowseListings() {
  const { data: listings, error } = await supabase
    .from("marketplace_listings")
    .select(
      "id,title,description,category,condition,meeting_place,price_type,price,price_min,price_max,photos,seller_id,status,created_at,updated_at",
    )
    .in("status", ["available", "reserved", "sold"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  const ids = [...new Set((listings ?? []).map((listing) => listing.seller_id))];
  const { data: profiles } = ids.length
    ? await supabase
        .from("student_profiles")
        .select("user_id,first_name,last_name,school")
        .in("user_id", ids)
    : { data: [] };
  return {
    listings: listings ?? [],
    sellers: Object.fromEntries(
      (profiles ?? []).map((profile) => [
        profile.user_id,
        { name: `${profile.first_name} ${profile.last_name}`.trim(), school: profile.school },
      ]),
    ),
  };
}

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "CamFlea — Campus Marketplace" },
      {
        name: "description",
        content: "Browse, buy, and sell campus finds with the CamFlea student community.",
      },
      { property: "og:title", content: "CamFlea — Campus Marketplace" },
      {
        property: "og:description",
        content: "Browse, buy, and sell campus finds with the CamFlea student community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <CamFleaPageShell>
      <BrowsePage loadListings={loadBrowseListings} />
    </CamFleaPageShell>
  ),
});
