import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listingInputSchema } from "@/lib/validation/listing";

export function listingInsertForOwner(ownerId: string, input: z.infer<typeof listingInputSchema>) {
  if (input.priceType === "single" && (input.price === null || input.price === undefined)) {
    throw new Error("Price is required.");
  }
  if (input.priceType === "range") {
    if (input.priceMin === null || input.priceMin === undefined)
      throw new Error("Minimum price is required.");
    if (input.priceMax === null || input.priceMax === undefined)
      throw new Error("Maximum price is required.");
    if (input.priceMin > input.priceMax)
      throw new Error("Minimum price cannot be greater than maximum price.");
  }
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    condition: input.condition,
    meeting_place: input.meetingPlace.trim(),
    price_type: input.priceType,
    price: input.priceType === "single" ? (input.price ?? null) : null,
    price_min: input.priceType === "range" ? (input.priceMin ?? null) : null,
    price_max: input.priceType === "range" ? (input.priceMax ?? null) : null,
    photos: input.photos,
    seller_id: ownerId,
  };
}
const listingId = z.string().uuid();
export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(listingInputSchema)
  .handler(async ({ data, context }) => {
    const { data: listing, error } = await context.supabase
      .from("marketplace_listings")
      .insert(listingInsertForOwner(context.userId, data))
      .select("id")
      .single();
    if (error) throw new Error("Could not create listing.");
    return listing;
  });
const listingPhotosSchema = z.object({
  id: listingId,
  photos: z.array(z.string().trim().min(1).max(500)).max(5),
});
export const attachListingPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(listingPhotosSchema)
  .handler(async ({ data, context }) => {
    if (data.photos.some((path) => !path.startsWith(`${context.userId}/`))) {
      throw new Error("Listing photo path is not owned by the authenticated user.");
    }
    const { error } = await context.supabase
      .from("marketplace_listings")
      .update({ photos: data.photos })
      .eq("id", data.id)
      .eq("seller_id", context.userId);
    if (error) throw new Error("Could not attach listing photos.");
    return { success: true };
  });
export const updateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: listingId, input: listingInputSchema }))
  .handler(async ({ data, context }) => {
    const { seller_id: _sellerId, ...updates } = listingInsertForOwner(context.userId, data.input);
    const { data: listing, error } = await context.supabase
      .from("marketplace_listings")
      .update(updates)
      .eq("id", data.id)
      .eq("seller_id", context.userId)
      .select("id")
      .single();
    if (error) throw new Error("Could not update listing.");
    return listing;
  });
export const deleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: listingId }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("marketplace_listings")
      .delete()
      .eq("id", data.id)
      .eq("seller_id", context.userId);
    if (error) throw new Error("Could not remove listing.");
    return { success: true };
  });
