import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Eye,
  Filter,
  HandCoins,
  Laptop,
  MapPin,
  MessageCircle,
  Package,
  PackageCheck,
  Pin,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trophy,
  X,
} from "lucide-react";

import { filterAndSortListings, formatListingPrice } from "@/features/browse/domain";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/domain/listings";

export type LandingListing = Tables<"marketplace_listings">;

type CategoryTone = "books" | "clothes" | "gadgets" | "sports" | "crafted" | "other";

const CATEGORY_META: Record<
  (typeof LISTING_CATEGORIES)[number],
  {
    icon: typeof BookOpen;
    shortName: string;
    blurb: string;
    tone: CategoryTone;
  }
> = {
  "Books & School Supplies": {
    icon: BookOpen,
    shortName: "Books & Supplies",
    blurb: "Textbooks, scientific calculators, lab coats & drafting kits",
    tone: "books",
  },
  "Clothes & Accessories": {
    icon: Shirt,
    shortName: "Clothes & Apparel",
    blurb: "Campus jackets, everyday totes, sneakers & accessories",
    tone: "clothes",
  },
  "Gadgets & Electronics": {
    icon: Laptop,
    shortName: "Gadgets & Tech",
    blurb: "Keyboards, headphones, study lamps, hubs & power banks",
    tone: "gadgets",
  },
  "Sports & Outdoors": {
    icon: Trophy,
    shortName: "Sports & Outdoors",
    blurb: "Badminton rackets, yoga mats, basketballs & tumblers",
    tone: "sports",
  },
  "Crafted & Collectibles": {
    icon: Sparkles,
    shortName: "Crafted & Collectibles",
    blurb: "Student-made crochet, art prints, enamel pins & ceramics",
    tone: "crafted",
  },
  Other: {
    icon: Package,
    shortName: "Dorm & Essentials",
    blurb: "Desk mirrors, storage crates, electric kettles & fans",
    tone: "other",
  },
};

function getCategoryMeta(category: string) {
  const match = LISTING_CATEGORIES.find(
    (item) => item.toLowerCase() === category.trim().toLowerCase(),
  );
  return match ? CATEGORY_META[match] : CATEGORY_META.Other;
}

function splitDemoTitle(title: string): { isDemo: boolean; cleanTitle: string } {
  const match = title.match(/^\[DEMO DATA\]\s*(.+)$/i);
  if (!match) return { isDemo: false, cleanTitle: title };
  return { isDemo: true, cleanTitle: match[1] };
}

function cleanDemoDescription(description: string): string {
  return description.replace(/^\[DEMO DATA\]\s*/i, "");
}

const TRENDING_SEARCHES = [
  "Calculator",
  "Textbook",
  "Keyboard",
  "Jacket",
  "Main Library",
  "Lab coat",
] as const;

const CAMPUS_MEETUP_SPOTS = [
  "Main Library lobby",
  "Student Union entrance",
  "Engineering building atrium",
  "Canteen patio",
  "Arts building foyer",
  "Gym gate",
] as const;

const features = [
  {
    icon: ShoppingBag,
    title: "Buy and sell nearby",
    copy: "Find textbooks, gadgets, clothes and more from students on your campus.",
  },
  {
    icon: MessageCircle,
    title: "Chat before you meet",
    copy: "Message sellers, agree on a price, and pick a public meet-up spot.",
  },
  {
    icon: ShieldCheck,
    title: "Students only",
    copy: "Every member signs in, so you always know you're trading within the community.",
  },
] as const;

const transactionSteps = [
  {
    step: "01",
    icon: ShoppingCart,
    title: "Add to cart & request",
    copy: "Spot a deal in the catalog and send a purchase request to reserve the listing.",
  },
  {
    step: "02",
    icon: MessageCircle,
    title: "Chat & confirm meet-up",
    copy: "Message the student seller directly on the listing thread to pick a campus time and spot.",
  },
  {
    step: "03",
    icon: MapPin,
    title: "Inspect on campus",
    copy: "Meet at a busy campus landmark like the Main Library lobby or Student Union entrance.",
  },
  {
    step: "04",
    icon: PackageCheck,
    title: "Complete the hand-off",
    copy: "Mark the item as received and complete the transaction with a preserved price snapshot.",
  },
] as const;

async function loadLandingListings(): Promise<LandingListing[]> {
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select(
      "id,title,description,category,condition,meeting_place,price_type,price,price_min,price_max,photos,seller_id,status,is_pinned,is_verified,created_at,updated_at",
    )
    .eq("status", "available")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) throw error;
  return data ?? [];
}

function useListingPhotoUrl(path: string | undefined) {
  const isDirectUrl = Boolean(path && /^https?:\/\//.test(path));
  const [url, setUrl] = useState<string | null>(isDirectUrl && path ? path : null);

  useEffect(() => {
    if (!path) return;
    if (/^https?:\/\//.test(path)) {
      setUrl(path);
      return;
    }
    let active = true;
    void supabase.storage
      .from("camflea-listings")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (!path) return null;
  if (isDirectUrl) return path;
  return url;
}

function StorefrontProductCard({
  listing,
  onQuickView,
}: {
  listing: LandingListing;
  onQuickView: (listing: LandingListing) => void;
}) {
  const imageUrl = useListingPhotoUrl(listing.photos?.[0]);
  const meta = getCategoryMeta(listing.category);
  const CategoryIcon = meta.icon;
  const { isDemo, cleanTitle } = splitDemoTitle(listing.title);
  const priceLabel = formatListingPrice(listing);

  return (
    <article className="landing-product-card">
      <div className={`landing-product-media landing-tone-${meta.tone}`}>
        <button
          type="button"
          className="landing-product-media-btn"
          onClick={() => onQuickView(listing)}
          aria-label={`Quick view ${listing.title}`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={listing.title}
              loading="lazy"
              decoding="async"
              className="landing-product-img"
            />
          ) : (
            <div className="landing-product-illustration" aria-hidden="true">
              <div className="landing-product-illustration-icon">
                <CategoryIcon size={34} strokeWidth={1.65} />
              </div>
              <span className="landing-product-illustration-label">{meta.shortName}</span>
            </div>
          )}
        </button>

        <div className="landing-product-badges">
          <span className="landing-badge landing-badge-condition">{listing.condition}</span>
          {listing.is_pinned ? (
            <span className="landing-badge landing-badge-featured">
              <Pin size={11} aria-hidden="true" /> Featured
            </span>
          ) : null}
          {listing.is_verified ? (
            <span className="landing-badge landing-badge-verified">
              <BadgeCheck size={12} aria-hidden="true" /> Verified
            </span>
          ) : null}
        </div>

        <button
          type="button"
          className="landing-quickview-pill"
          onClick={() => onQuickView(listing)}
          aria-label={`Inspect ${cleanTitle}`}
        >
          <Eye size={14} aria-hidden="true" />
          <span>Quick view</span>
        </button>
      </div>

      <div className="landing-product-body">
        <div className="landing-product-meta-top">
          <span className="landing-product-category">{listing.category}</span>
          {isDemo ? <span className="landing-demo-pill">Demo</span> : null}
        </div>

        <h3 className="landing-product-title">
          <button
            type="button"
            className="landing-product-title-btn"
            onClick={() => onQuickView(listing)}
          >
            {isDemo ? <span className="sr-only">[DEMO DATA] </span> : null}
            {cleanTitle}
          </button>
        </h3>

        <div className="landing-product-price-row">
          <strong className="landing-product-price">{priceLabel}</strong>
          {listing.price_type === "range" ? (
            <span className="landing-price-tag">Flexible range</span>
          ) : listing.price_type === "hidden" ? (
            <span className="landing-price-tag">Open to offers</span>
          ) : null}
        </div>

        <p className="landing-product-meetup">
          <MapPin size={14} aria-hidden="true" />
          <span>{listing.meeting_place}</span>
        </p>

        <div className="landing-product-actions">
          <button
            type="button"
            className="landing-card-btn-secondary"
            onClick={() => onQuickView(listing)}
          >
            Details
          </button>
          <Link to="/auth" className="landing-card-btn-primary">
            <ShoppingCart size={14} aria-hidden="true" />
            <span>Sign in to buy</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function ProductQuickViewModal({
  listing,
  onClose,
}: {
  listing: LandingListing;
  onClose: () => void;
}) {
  const imageUrl = useListingPhotoUrl(listing.photos?.[0]);
  const meta = getCategoryMeta(listing.category);
  const CategoryIcon = meta.icon;
  const { isDemo, cleanTitle } = splitDemoTitle(listing.title);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="landing-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="landing-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-quickview-title"
      >
        <button
          type="button"
          className="landing-modal-close"
          onClick={onClose}
          aria-label="Close quick view"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className={`landing-modal-media landing-tone-${meta.tone}`}>
          {imageUrl ? (
            <img src={imageUrl} alt={listing.title} className="landing-modal-img" />
          ) : (
            <div className="landing-modal-illustration" aria-hidden="true">
              <div className="landing-modal-illustration-icon">
                <CategoryIcon size={54} strokeWidth={1.5} />
              </div>
              <span>{listing.category}</span>
            </div>
          )}
          <div className="landing-modal-badges">
            <span className="landing-badge landing-badge-condition">{listing.condition}</span>
            <span className="landing-badge landing-badge-available">
              <CheckCircle2 size={12} aria-hidden="true" /> Available on campus
            </span>
          </div>
        </div>

        <div className="landing-modal-content">
          <div className="landing-modal-kicker">
            <span>{listing.category}</span>
            {listing.is_verified ? (
              <span className="landing-verified-inline">
                <BadgeCheck size={14} aria-hidden="true" /> Verified listing
              </span>
            ) : null}
            {isDemo ? <span className="landing-demo-pill">Demo listing</span> : null}
          </div>

          <h2 id="landing-quickview-title">
            {isDemo ? <span className="sr-only">[DEMO DATA] </span> : null}
            {cleanTitle}
          </h2>

          <div className="landing-modal-price-block">
            <strong className="landing-modal-price">{formatListingPrice(listing)}</strong>
            <span className="landing-modal-price-note">
              {listing.price_type === "range"
                ? "Negotiable within seller's price range"
                : listing.price_type === "hidden"
                  ? "Message seller to discuss price"
                  : "Campus meet-up price · No buyer fees"}
            </span>
          </div>

          <div className="landing-modal-description">
            <h3>Item description</h3>
            <p>{cleanDemoDescription(listing.description)}</p>
          </div>

          <div className="landing-modal-meetup-box">
            <div className="landing-modal-meetup-icon" aria-hidden="true">
              <MapPin size={18} />
            </div>
            <div>
              <span>CAMPUS MEET-UP SPOT</span>
              <strong>{listing.meeting_place}</strong>
              <p>Inspect the item in person at this campus location before completing payment.</p>
            </div>
          </div>

          <div className="landing-modal-cta-group">
            <Link to="/auth" className="landing-modal-cta-primary">
              <ShoppingCart size={18} aria-hidden="true" />
              <span>Sign in to add to cart</span>
            </Link>
            <Link to="/auth" className="landing-modal-cta-secondary">
              <MessageCircle size={18} aria-hidden="true" />
              <span>Message seller</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export function LandingPage({
  loadListings = loadLandingListings,
}: {
  loadListings?: () => Promise<LandingListing[]>;
} = {}) {
  const navigate = useNavigate();

  const [listings, setListings] = useState<LandingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [condition, setCondition] = useState<string>("all");
  const [meetupSpot, setMeetupSpot] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "price-low" | "price-high">("newest");
  const [visibleCount, setVisibleCount] = useState(12);
  const [quickViewListing, setQuickViewListing] = useState<LandingListing | null>(null);

  // Signed-in students skip the landing page and go straight to the marketplace.
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });
      if (active && !roleError) {
        void navigate({ to: isAdmin ? "/admin" : "/browse", replace: true });
      }
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void loadListings()
      .then((data) => {
        if (active) {
          setListings(data);
          setError(null);
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not load live campus listings right now.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadListings, reloadTick]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listings.length };
    for (const cat of LISTING_CATEGORIES) counts[cat] = 0;
    for (const item of listings) {
      const matched = LISTING_CATEGORIES.find(
        (cat) => cat.toLowerCase() === item.category.trim().toLowerCase(),
      );
      if (matched) counts[matched] = (counts[matched] ?? 0) + 1;
    }
    return counts;
  }, [listings]);

  const availableMeetupSpots = useMemo(() => {
    const spots = new Set<string>(CAMPUS_MEETUP_SPOTS);
    for (const item of listings) {
      if (item.meeting_place?.trim()) spots.add(item.meeting_place.trim());
    }
    return [...spots];
  }, [listings]);

  const filteredListings = useMemo(() => {
    const base = filterAndSortListings(listings, {
      query,
      category,
      condition,
      sort,
      availableOnly: true,
    });
    if (meetupSpot === "all") return base;
    return base.filter(
      (item) => item.meeting_place.trim().toLowerCase() === meetupSpot.trim().toLowerCase(),
    );
  }, [listings, query, category, condition, sort, meetupSpot]);

  const spotlightListing = useMemo(() => {
    return (
      listings.find((item) => item.is_pinned && item.price_type !== "hidden") ??
      listings.find((item) => item.is_verified && item.price_type !== "hidden") ??
      listings[0] ??
      null
    );
  }, [listings]);

  const hasActiveFilters =
    query.trim() !== "" || category !== "all" || condition !== "all" || meetupSpot !== "all";

  function resetFilters() {
    setQuery("");
    setCategory("all");
    setCondition("all");
    setMeetupSpot("all");
    setSort("newest");
    setVisibleCount(12);
  }

  function selectCategory(nextCategory: string, shouldScroll = false) {
    setCategory(nextCategory);
    setVisibleCount(12);
    if (shouldScroll) {
      document.getElementById("landing-catalog")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    document.getElementById("landing-catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  const displayedListings = filteredListings.slice(0, visibleCount);
  const spotlightMeta = spotlightListing
    ? getCategoryMeta(spotlightListing.category)
    : CATEGORY_META["Books & School Supplies"];
  const SpotlightIcon = spotlightMeta.icon;
  const spotlightTitle = spotlightListing
    ? splitDemoTitle(spotlightListing.title).cleanTitle
    : "Scientific Calculator & Study Essentials";

  return (
    <div className="landing">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-primary"
      >
        Skip to content
      </a>

      {/* Top Campus E-Commerce Announcement & Utility Strip */}
      <div className="landing-topbar">
        <div className="landing-topbar-inner">
          <div className="landing-topbar-perks">
            <span className="landing-topbar-item">
              <ShieldCheck size={14} aria-hidden="true" />
              Verified Campus Community
            </span>
            <span className="landing-topbar-sep" aria-hidden="true">
              ·
            </span>
            <span className="landing-topbar-item">
              <MapPin size={14} aria-hidden="true" />
              On-Campus Meet-up & Inspection
            </span>
            <span className="landing-topbar-sep" aria-hidden="true">
              ·
            </span>
            <span className="landing-topbar-item">
              <HandCoins size={14} aria-hidden="true" />
              ₱0 Listing Fees
            </span>
          </div>
          <div className="landing-topbar-links">
            <a href="#landing-catalog">Browse Catalog</a>
            <a href="#landing-categories">Departments</a>
            <a href="#landing-how-it-works">How Buying Works</a>
          </div>
        </div>
      </div>

      {/* Main Sticky Storefront Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-brand" aria-label="CamFlea campus marketplace home">
            <img src="/camflea-assets/logo-white.png" alt="CamFlea" />
            <span className="landing-brand-tag">CAMPUS STORE</span>
          </Link>

          <form
            className="landing-header-search"
            role="search"
            aria-label="Marketplace product search"
            onSubmit={handleSearchSubmit}
          >
            <Search size={18} aria-hidden="true" className="landing-header-search-icon" />
            <input
              type="search"
              role="searchbox"
              aria-label="Search campus marketplace"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(12);
              }}
              placeholder="Search textbooks, calculators, keyboards, jackets, or meet-up spots…"
            />
            {query ? (
              <button
                type="button"
                className="landing-header-search-clear"
                aria-label="Clear search query"
                onClick={() => setQuery("")}
              >
                <X size={15} aria-hidden="true" />
              </button>
            ) : null}
            <button type="submit" className="landing-header-search-btn">
              Search
            </button>
          </form>

          <div className="landing-header-actions">
            <Link to="/auth" className="landing-sell-btn">
              <Plus size={16} aria-hidden="true" />
              <span>Sell an item</span>
            </Link>
            <Link to="/auth" className="landing-login">
              Log in
            </Link>
          </div>
        </div>
      </header>

      {/* E-Commerce Department Ribbon */}
      <nav aria-label="Marketplace departments" className="landing-dept-bar">
        <div className="landing-dept-bar-inner">
          <button
            type="button"
            className={`landing-dept-pill ${category === "all" ? "is-active" : ""}`}
            aria-pressed={category === "all"}
            onClick={() => selectCategory("all")}
          >
            <ShoppingBag size={15} aria-hidden="true" />
            <span>All Departments</span>
            {!loading && listings.length > 0 ? (
              <span className="landing-dept-count">{categoryCounts.all}</span>
            ) : null}
          </button>
          {LISTING_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const active = category.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                className={`landing-dept-pill ${active ? "is-active" : ""}`}
                aria-pressed={active}
                onClick={() => selectCategory(cat)}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{cat}</span>
                {!loading && (categoryCounts[cat] ?? 0) > 0 ? (
                  <span className="landing-dept-count">{categoryCounts[cat]}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      <main id="landing-main">
        {/* Hero Merchandising Bento Section */}
        <section className="landing-hero-section" aria-label="Campus marketplace showcase">
          <div className="landing-hero-bento">
            <div className="landing-hero">
              <div className="landing-hero-eyebrow-row">
                <p className="eyebrow">CAMPUS FINDS, SECOND LIFE</p>
                <span className="landing-live-pill">
                  <span className="landing-live-dot" aria-hidden="true" />
                  {!loading && listings.length > 0
                    ? `${listings.length} active campus listings`
                    : "Student-to-student marketplace"}
                </span>
              </div>

              <h1>
                Good finds stay <em>local.</em>
              </h1>

              <p className="landing-lede">
                CamFlea is the student e-commerce marketplace for your campus. Shop second-hand
                textbooks, electronics, dorm essentials, and apparel from classmates—reserve online
                and inspect in person at a campus meet-up spot.
              </p>

              <div className="landing-actions">
                <div className="landing-cta-row">
                  <Link to="/auth" className="landing-cta">
                    <span>Sign in to get started</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  <a href="#landing-catalog" className="landing-cta-secondary">
                    Explore live catalog
                  </a>
                </div>
                <span className="landing-note">
                  Free for students · Verified school sign-in required for cart & chat
                </span>
              </div>

              <div className="landing-trending-row" aria-label="Popular campus searches">
                <span className="landing-trending-label">Popular searches:</span>
                <div className="landing-trending-chips">
                  {TRENDING_SEARCHES.map((term) => (
                    <button
                      key={term}
                      type="button"
                      className="landing-trending-chip"
                      onClick={() => {
                        setQuery(term);
                        setCategory("all");
                        document
                          .getElementById("landing-catalog")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <Search size={12} aria-hidden="true" />
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Merchandising Column: Spotlight Deal + Promo Tiles */}
            <div className="landing-merch-column">
              <article className="landing-spotlight-card" aria-label="Featured campus listing">
                <div className="landing-spotlight-top">
                  <span className="landing-spotlight-tag">
                    <Sparkles size={13} aria-hidden="true" />
                    {spotlightListing ? "Featured Campus Find" : "Sample Spotlight Preview"}
                  </span>
                  <span className="landing-badge landing-badge-condition">
                    {spotlightListing ? spotlightListing.condition : "Like new"}
                  </span>
                </div>

                <div className="landing-spotlight-body">
                  <div
                    className={`landing-spotlight-visual landing-tone-${spotlightMeta.tone}`}
                    aria-hidden="true"
                  >
                    <SpotlightIcon size={40} strokeWidth={1.6} />
                  </div>
                  <div className="landing-spotlight-info">
                    <span className="landing-spotlight-category">
                      {spotlightListing ? spotlightListing.category : "Books & School Supplies"}
                    </span>
                    <h2>{spotlightTitle}</h2>
                    <div className="landing-spotlight-price">
                      {spotlightListing ? formatListingPrice(spotlightListing) : "₱1,150.00"}
                    </div>
                    <p className="landing-spotlight-meetup">
                      <MapPin size={14} aria-hidden="true" />
                      <span>
                        Meet-up:{" "}
                        <strong>
                          {spotlightListing
                            ? spotlightListing.meeting_place
                            : "Engineering building atrium"}
                        </strong>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="landing-spotlight-footer">
                  {spotlightListing ? (
                    <button
                      type="button"
                      className="landing-spotlight-btn"
                      onClick={() => setQuickViewListing(spotlightListing)}
                    >
                      <Eye size={15} aria-hidden="true" />
                      <span>Inspect listing</span>
                    </button>
                  ) : null}
                  <Link to="/auth" className="landing-spotlight-buy">
                    <ShoppingCart size={15} aria-hidden="true" />
                    <span>Sign in to reserve</span>
                  </Link>
                </div>
              </article>

              <div className="landing-promo-pair">
                <button
                  type="button"
                  className="landing-promo-tile landing-tone-books"
                  onClick={() => selectCategory("Books & School Supplies", true)}
                >
                  <div className="landing-promo-icon" aria-hidden="true">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <strong>Semester Books & Lab Gear</strong>
                    <span>Textbooks, calculators & drafting kits</span>
                  </div>
                  <ArrowRight size={16} aria-hidden="true" className="landing-promo-arrow" />
                </button>

                <button
                  type="button"
                  className="landing-promo-tile landing-tone-gadgets"
                  onClick={() => selectCategory("Gadgets & Electronics", true)}
                >
                  <div className="landing-promo-icon" aria-hidden="true">
                    <Laptop size={20} />
                  </div>
                  <div>
                    <strong>Campus Tech & Desk Setup</strong>
                    <span>Keyboards, headphones, lamps & hubs</span>
                  </div>
                  <ArrowRight size={16} aria-hidden="true" className="landing-promo-arrow" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Shop by Department Bento Grid */}
        <section
          id="landing-categories"
          className="landing-section"
          aria-labelledby="landing-categories-heading"
        >
          <div className="landing-section-header">
            <div>
              <p className="eyebrow">SHOP BY DEPARTMENT</p>
              <h2 id="landing-categories-heading">Every campus category in one place</h2>
            </div>
            {category !== "all" ? (
              <button
                type="button"
                className="landing-text-action"
                onClick={() => selectCategory("all")}
              >
                Show all departments
              </button>
            ) : null}
          </div>

          <div className="landing-category-grid">
            {LISTING_CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const isSelected = category.toLowerCase() === cat.toLowerCase();
              const count = categoryCounts[cat] ?? 0;

              return (
                <button
                  key={cat}
                  type="button"
                  className={`landing-category-card landing-tone-${meta.tone} ${
                    isSelected ? "is-selected" : ""
                  }`}
                  aria-pressed={isSelected}
                  onClick={() => selectCategory(isSelected ? "all" : cat, true)}
                >
                  <div className="landing-category-card-top">
                    <span className="landing-category-icon" aria-hidden="true">
                      <Icon size={24} strokeWidth={1.75} />
                    </span>
                    <span className="landing-category-count">
                      {loading ? "Browse" : `${count} ${count === 1 ? "item" : "items"}`}
                    </span>
                  </div>
                  <strong>{cat}</strong>
                  <p>{meta.blurb}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Live Campus Storefront Catalog */}
        <section
          id="landing-catalog"
          className="landing-section landing-storefront-section"
          aria-labelledby="landing-catalog-heading"
        >
          <div className="landing-storefront-header">
            <div>
              <p className="eyebrow">LIVE CAMPUS STOREFRONT</p>
              <h2 id="landing-catalog-heading">
                {query.trim()
                  ? `Search results for “${query.trim()}”`
                  : category !== "all"
                    ? category
                    : "Available on campus right now"}
              </h2>
              <p className="landing-storefront-subtitle" aria-live="polite">
                {loading
                  ? "Loading available student listings…"
                  : `${filteredListings.length} ${
                      filteredListings.length === 1 ? "available listing" : "available listings"
                    } ready for campus meet-up`}
              </p>
            </div>

            <div className="landing-storefront-controls">
              <div className="landing-control-field">
                <label htmlFor="landing-condition-filter">
                  <Filter size={13} aria-hidden="true" /> Condition
                </label>
                <select
                  id="landing-condition-filter"
                  aria-label="Filter by condition"
                  value={condition}
                  onChange={(event) => {
                    setCondition(event.target.value);
                    setVisibleCount(12);
                  }}
                >
                  <option value="all">All conditions</option>
                  {LISTING_CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>

              <div className="landing-control-field">
                <label htmlFor="landing-meetup-filter">
                  <MapPin size={13} aria-hidden="true" /> Meet-up spot
                </label>
                <select
                  id="landing-meetup-filter"
                  aria-label="Filter by meet-up spot"
                  value={meetupSpot}
                  onChange={(event) => {
                    setMeetupSpot(event.target.value);
                    setVisibleCount(12);
                  }}
                >
                  <option value="all">All campus spots</option>
                  {availableMeetupSpots.map((spot) => (
                    <option key={spot} value={spot}>
                      {spot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="landing-control-field">
                <label htmlFor="landing-sort-select">
                  <SlidersHorizontal size={13} aria-hidden="true" /> Sort by
                </label>
                <select
                  id="landing-sort-select"
                  aria-label="Sort listings"
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as "newest" | "price-low" | "price-high")
                  }
                >
                  <option value="newest">Featured & newest</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  className="landing-reset-btn"
                  onClick={resetFilters}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Reset filters</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Campus Meet-up Quick Filter Bar */}
          <div className="landing-meetup-strip" aria-label="Filter by campus meet-up location">
            <span className="landing-meetup-strip-label">
              <MapPin size={14} aria-hidden="true" /> Popular meet-up zones:
            </span>
            <div className="landing-meetup-chips">
              <button
                type="button"
                className={`landing-meetup-chip ${meetupSpot === "all" ? "is-active" : ""}`}
                aria-pressed={meetupSpot === "all"}
                onClick={() => setMeetupSpot("all")}
              >
                All spots
              </button>
              {CAMPUS_MEETUP_SPOTS.map((spot) => {
                const active = meetupSpot.toLowerCase() === spot.toLowerCase();
                return (
                  <button
                    key={spot}
                    type="button"
                    className={`landing-meetup-chip ${active ? "is-active" : ""}`}
                    aria-pressed={active}
                    onClick={() => setMeetupSpot(active ? "all" : spot)}
                  >
                    {spot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid States */}
          {loading ? (
            <div
              className="landing-product-grid"
              role="status"
              aria-busy="true"
              aria-label="Loading campus listings"
            >
              <span className="sr-only">Loading campus listings…</span>
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="landing-product-skeleton" aria-hidden="true">
                  <div className="landing-skeleton-media" />
                  <div className="landing-skeleton-body">
                    <div className="landing-skeleton-line landing-skeleton-short" />
                    <div className="landing-skeleton-line" />
                    <div className="landing-skeleton-line landing-skeleton-medium" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="landing-state-box" role="alert">
              <ShoppingBag size={28} aria-hidden="true" />
              <h3>Could not load live listings</h3>
              <p>{error}</p>
              <button
                type="button"
                className="landing-cta"
                onClick={() => setReloadTick((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          ) : displayedListings.length > 0 ? (
            <>
              <div className="landing-product-grid">
                {displayedListings.map((listing) => (
                  <StorefrontProductCard
                    key={listing.id}
                    listing={listing}
                    onQuickView={setQuickViewListing}
                  />
                ))}
              </div>

              {filteredListings.length > visibleCount ? (
                <div className="landing-load-more">
                  <p>
                    Showing {displayedListings.length} of {filteredListings.length} matching campus
                    listings
                  </p>
                  <button
                    type="button"
                    className="landing-load-more-btn"
                    onClick={() => setVisibleCount((prev) => prev + 12)}
                  >
                    Show more listings
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="landing-state-box">
              <ShoppingBag size={28} aria-hidden="true" />
              <h3>
                {hasActiveFilters
                  ? "No listings match your current filters"
                  : "No campus listings are available yet"}
              </h3>
              <p>
                {hasActiveFilters
                  ? "Try clearing a filter or searching for another item or campus meet-up location."
                  : "Sign in with your student account to post the first item on campus."}
              </p>
              {hasActiveFilters ? (
                <button type="button" className="landing-cta" onClick={resetFilters}>
                  Reset all filters
                </button>
              ) : (
                <Link to="/auth" className="landing-cta">
                  Sign in to post an item
                </Link>
              )}
            </div>
          )}
        </section>

        {/* How Campus E-Commerce Works */}
        <section
          id="landing-how-it-works"
          className="landing-section"
          aria-labelledby="landing-steps-heading"
        >
          <div className="landing-section-header">
            <div>
              <p className="eyebrow">HOW CAMFLEA WORKS</p>
              <h2 id="landing-steps-heading">From campus cart to in-person hand-off</h2>
            </div>
            <Link to="/auth" className="landing-text-action">
              Create your student account <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="landing-steps-grid">
            {transactionSteps.map(({ step, icon: Icon, title, copy }) => (
              <article key={step} className="landing-step-card">
                <div className="landing-step-top">
                  <span className="landing-step-icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="landing-step-number">STEP {step}</span>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Core Trust Pillars (Why CamFlea) */}
        <section className="landing-features" aria-label="Why CamFlea">
          {features.map(({ icon: Icon, title, copy }) => (
            <article key={title}>
              <span aria-hidden="true">
                <Icon size={22} />
              </span>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </section>

        {/* Seller Merchandising Callout Banner */}
        <section className="landing-section" aria-labelledby="landing-seller-heading">
          <div className="landing-seller-banner">
            <div className="landing-seller-copy">
              <p className="eyebrow">SELL ON YOUR CAMPUS</p>
              <h2 id="landing-seller-heading">Turn extra textbooks & gear into campus cash</h2>
              <p>
                List up to 5 photos, pick your preferred campus meet-up spot, and choose how you
                price your item: set a fixed Peso price, offer a price range, or let buyers message
                you with an offer.
              </p>
              <div className="landing-seller-tags">
                <span>
                  <Tag size={14} aria-hidden="true" /> Fixed PHP price
                </span>
                <span>
                  <SlidersHorizontal size={14} aria-hidden="true" /> Flexible price range
                </span>
                <span>
                  <MessageCircle size={14} aria-hidden="true" /> Discuss price in chat
                </span>
              </div>
            </div>
            <div className="landing-seller-cta">
              <Link to="/auth" className="landing-cta">
                <Plus size={18} aria-hidden="true" />
                <span>Start selling on CamFlea</span>
              </Link>
              <small>Takes less than a minute · Student account required</small>
            </div>
          </div>
        </section>
      </main>

      {/* Multi-column E-Commerce Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <img src="/camflea-assets/logo.png" alt="CamFlea" />
            <p>
              The verified student marketplace for campus buying, selling, and safe in-person
              hand-offs.
            </p>
          </div>

          <div className="landing-footer-col">
            <strong>Shop Departments</strong>
            <ul>
              {LISTING_CATEGORIES.map((cat) => (
                <li key={cat}>
                  <button type="button" onClick={() => selectCategory(cat, true)}>
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="landing-footer-col">
            <strong>Student Account</strong>
            <ul>
              <li>
                <Link to="/auth">Log in</Link>
              </li>
              <li>
                <Link to="/auth">Create student account</Link>
              </li>
              <li>
                <Link to="/auth">Post an item for sale</Link>
              </li>
              <li>
                <Link to="/auth">My cart & transactions</Link>
              </li>
            </ul>
          </div>

          <div className="landing-footer-col">
            <strong>Campus Safety</strong>
            <ul>
              <li>Meet in well-lit campus landmarks</li>
              <li>Inspect items before confirming receipt</li>
              <li>Keep conversations inside CamFlea chat</li>
              <li>Report suspicious listings to campus staff</li>
            </ul>
          </div>
        </div>
        <div className="landing-footer-bottom">© CamFlea · Buy a little closer.</div>
      </footer>

      {quickViewListing ? (
        <ProductQuickViewModal
          listing={quickViewListing}
          onClose={() => setQuickViewListing(null)}
        />
      ) : null}
    </div>
  );
}
