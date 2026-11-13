import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ListingDetail } from "@/features/listings/listing-detail";
import { CamFleaPageShell } from "@/components/camflea-page-shell";
import { FeedbackState } from "@/components/feedback-state";
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
      <CamFleaPageShell>
        <FeedbackState kind="loading" title="Loading listing…" />
      </CamFleaPageShell>
    );
  if (state === "error")
    return (
      <CamFleaPageShell>
        <FeedbackState
          kind="error"
          title="Could not load this listing"
          copy="Check your connection and try again."
          action={
            <button
              type="button"
              className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground"
              onClick={() => location.reload()}
            >
              Try again
            </button>
          }
        />
      </CamFleaPageShell>
    );
  if (state === "missing" || !listing)
    return (
      <CamFleaPageShell>
        <FeedbackState
          kind="unavailable"
          title="Listing unavailable"
          copy="This listing may have been removed or is not visible."
          action={
            <Link to="/browse" className="font-semibold text-primary underline">
              Browse listings
            </Link>
          }
        />
      </CamFleaPageShell>
    );
  return (
    <CamFleaPageShell>
      <ListingDetail listing={listing} seller={seller} />
    </CamFleaPageShell>
  );
}
