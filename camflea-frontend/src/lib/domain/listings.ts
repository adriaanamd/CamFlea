export type PriceType = "single" | "range" | "hidden";

export type ListingStatus = "available" | "reserved" | "sold" | "removed";

export type ListingPrice = {
  priceType: PriceType;
  price: number | null | undefined;
  priceMin: number | null | undefined;
  priceMax: number | null | undefined;
};

export const LISTING_CATEGORIES = [
  "Books & School Supplies",
  "Clothes & Accessories",
  "Gadgets & Electronics",
  "Sports & Outdoors",
  "Crafted & Collectibles",
  "Other",
] as const;

export const LISTING_CONDITIONS = ["New", "Like new", "Good", "Fair"] as const;

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPeso(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Price hidden";
  return pesoFormatter.format(value);
}

export function formatListingPrice(listing: ListingPrice): string {
  if (listing.priceType === "range") {
    if (listing.priceMin === null || listing.priceMin === undefined) return "Price hidden";
    if (listing.priceMax === null || listing.priceMax === undefined) return formatPeso(listing.priceMin);
    return `${formatPeso(listing.priceMin)}–${formatPeso(listing.priceMax)}`;
  }

  if (listing.priceType === "hidden") return "Price hidden";
  return formatPeso(listing.price);
}
