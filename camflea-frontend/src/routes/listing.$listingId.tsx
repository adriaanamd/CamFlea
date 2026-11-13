import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ListingDetail } from "@/features/listings/listing-detail";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/listing/$listingId")({ component: ListingRoute });
function ListingRoute() {
  const { listingId } = Route.useParams() as { listingId: string };
  const [listing, setListing] = useState<Tables<"marketplace_listings"> | null>(null);
  const [seller, setSeller] = useState("Campus student");
  const [state, setState] = useState<"loading" | "ready" | "error" | "missing">("loading");
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select(
          "id,title,description,category,condition,meeting_place,price_type,price,price_min,price_max,photos,seller_id,status,created_at,updated_at",
        )
        .eq("id", listingId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setState("error");
        return;
      }
      if (!data) {
        setState("missing");
        return;
      }
      setListing(data);
      const { data: profile } = await supabase
        .from("student_profiles")
        .select("first_name,last_name")
        .eq("user_id", data.seller_id)
        .maybeSingle();
      if (active) {
        if (profile) setSeller(`${profile.first_name} ${profile.last_name}`.trim());
        setState("ready");
      }
    })();
    return () => {
      active = false;
    };
  }, [listingId]);
  if (state === "loading")
    return (
      <p role="status" className="p-8">
        Loading listing…
      </p>
    );
  if (state === "error")
    return (
      <p role="alert" className="p-8">
        Could not load this listing. <button onClick={() => location.reload()}>Try again</button>
      </p>
    );
  if (state === "missing" || !listing)
    return (
      <main className="p-8">
        <h1>Listing unavailable</h1>
        <p>This listing may have been removed or is not visible.</p>
        <Link to="/">Browse listings</Link>
      </main>
    );
  return <ListingDetail listing={listing} seller={seller} />;
}
