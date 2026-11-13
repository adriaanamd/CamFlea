import { formatPeso } from "@/lib/camflea-workflow";
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/domain/listings";

export const browseCategories = LISTING_CATEGORIES;

export const browseConditions = LISTING_CONDITIONS;

export type BrowseListing = {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  meeting_place: string;
  price_type: string;
  price: number | null;
  price_min: number | null;
  price_max: number | null;
  created_at: string;
  seller_id?: string;
  status?: string;
};

export type BrowseOptions = {
  query: string;
  category: string;
  condition: string;
  sort: "newest" | "price-low" | "price-high";
  availableOnly?: boolean;
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function comparablePrice(listing: BrowseListing) {
  if (listing.price_type === "range") return listing.price_min ?? Number.POSITIVE_INFINITY;
  if (listing.price_type === "hidden") return Number.POSITIVE_INFINITY;
  return listing.price ?? Number.POSITIVE_INFINITY;
}

export function formatListingPrice(
  listing: Pick<BrowseListing, "price_type" | "price" | "price_min" | "price_max">,
) {
  if (listing.price_type === "hidden") return "Price hidden";
  if (listing.price_type === "range") {
    return `${formatPeso(listing.price_min)} – ${formatPeso(listing.price_max)}`;
  }
  return formatPeso(listing.price);
}

export function filterAndSortListings<T extends BrowseListing>(
  listings: readonly T[],
  options: BrowseOptions,
): T[] {
  const query = options.query.trim().toLocaleLowerCase();
  const filtered = listings.filter((listing) => {
    const matchesQuery =
      !query ||
      [listing.title, listing.description, listing.category, listing.meeting_place].some((value) =>
        value.toLocaleLowerCase().includes(query),
      );
    const matchesCategory = options.category === "all" || same(listing.category, options.category);
    const matchesCondition =
      options.condition === "all" || same(listing.condition, options.condition);
    const matchesStatus =
      !options.availableOnly || !listing.status || listing.status === "available";
    return matchesQuery && matchesCategory && matchesCondition && matchesStatus;
  });

  return filtered.sort((left, right) => {
    if (options.sort === "newest") return right.created_at.localeCompare(left.created_at);
    const leftPrice = comparablePrice(left);
    const rightPrice = comparablePrice(right);
    if (leftPrice !== rightPrice && !Number.isFinite(leftPrice)) return 1;
    if (leftPrice !== rightPrice && !Number.isFinite(rightPrice)) return -1;
    if (leftPrice === rightPrice) {
      return right.created_at.localeCompare(left.created_at);
    }
    const difference = leftPrice - rightPrice;
    return options.sort === "price-low" ? difference : -difference;
  });
}
