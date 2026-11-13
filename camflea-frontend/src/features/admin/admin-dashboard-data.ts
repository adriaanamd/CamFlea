import type { Tables } from "@/integrations/supabase/types";

export type AdminUser = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  school: string | null;
  program: string | null;
  year_level: string | null;
  profile_image: string | null;
  bio: string | null;
  is_banned: boolean;
  status: string;
  reason: string | null;
  warning_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminListing = Tables<"marketplace_listings">;
export type AdminTransaction = Tables<"marketplace_transactions">;
export type AdminReport = Tables<"marketplace_reports">;

export type AdminDistribution = { label: string; count: number };

export type AdminAnalytics = {
  usersByYear: AdminDistribution[];
  studentsByProgram: AdminDistribution[];
  listingsByCategory: AdminDistribution[];
  listingsByStatus: AdminDistribution[];
  listingsByCondition: AdminDistribution[];
  listingsByPriceType: AdminDistribution[];
  listingsByPriceRange: AdminDistribution[];
  transactionsByStatus: AdminDistribution[];
  reportsByReason: AdminDistribution[];
  listingsByMonth: AdminDistribution[];
  averageDaysToSell: number | null;
};

const YEAR_LEVEL_ORDER = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const CONDITION_ORDER = ["New", "Like new", "Good", "Fair"];
const PRICE_RANGE_ORDER = ["Under ₱500", "₱500–₱1,499", "₱1,500–₱2,999", "₱3,000+", "Price hidden"];
const STUDENTS_BY_PROGRAM_LIMIT = 5;

function countBy(values: string[], order?: string[]): AdminDistribution[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const orderMap = order
    ? new Map(order.map((label, index) => [label.toLowerCase(), index]))
    : null;

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => {
      if (orderMap) {
        const leftIndex = orderMap.get(left.label.toLowerCase()) ?? order.length;
        const rightIndex = orderMap.get(right.label.toLowerCase()) ?? order.length;
        if (leftIndex !== rightIndex) return leftIndex - rightIndex;
      }
      return right.count - left.count || left.label.localeCompare(right.label);
    });
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "Unknown";
}

export function buildAdminAnalytics(
  users: AdminUser[],
  listings: AdminListing[],
  transactions: AdminTransaction[],
  reports: AdminReport[],
): AdminAnalytics {
  const listingsById = new Map(listings.map((listing) => [listing.id, listing]));
  const completedDurations = transactions
    .filter((transaction) => transaction.status === "completed")
    .map((transaction) => {
      const listing = listingsById.get(transaction.listing_id);
      if (!listing) return null;
      const days =
        (new Date(transaction.updated_at).getTime() - new Date(listing.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      return Number.isFinite(days) && days >= 0 ? days : null;
    })
    .filter((days): days is number => days !== null);

  return {
    usersByYear: countBy(
      users.map((user) => displayValue(user.year_level)),
      YEAR_LEVEL_ORDER,
    ),
    studentsByProgram: countBy(users.map((user) => displayValue(user.program))).slice(
      0,
      STUDENTS_BY_PROGRAM_LIMIT,
    ),
    listingsByCategory: countBy(listings.map((listing) => listing.category)),
    listingsByStatus: countBy(listings.map((listing) => listing.status)),
    listingsByCondition: countBy(
      listings.map((listing) => listing.condition),
      CONDITION_ORDER,
    ),
    listingsByPriceType: countBy(listings.map((listing) => listing.price_type)),
    listingsByPriceRange: countBy(
      listings.map((listing) => {
        const price = listing.price ?? listing.price_min ?? listing.price_max;
        if (price === null || price === undefined) return "Price hidden";
        if (price < 500) return "Under ₱500";
        if (price < 1500) return "₱500–₱1,499";
        if (price < 3000) return "₱1,500–₱2,999";
        return "₱3,000+";
      }),
      PRICE_RANGE_ORDER,
    ),
    transactionsByStatus: countBy(transactions.map((transaction) => transaction.status)),
    reportsByReason: countBy(reports.map((report) => report.reason)),
    listingsByMonth: countBy(listings.map((listing) => listing.created_at.slice(0, 7))).sort(
      (left, right) => left.label.localeCompare(right.label),
    ),
    averageDaysToSell:
      completedDurations.length > 0
        ? Math.round(
            (completedDurations.reduce((sum, days) => sum + days, 0) / completedDurations.length) *
              10,
          ) / 10
        : null,
  };
}
