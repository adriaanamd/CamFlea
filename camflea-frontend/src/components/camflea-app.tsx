import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  CircleUserRound,
  Filter,
  Heart,
  Mail,
  MessageCircle,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Tag,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { canTakeTransactionAction, formatPeso, type TransactionAction } from "@/lib/camflea-workflow";
import { authInputSchema } from "@/lib/validation/auth";
import { updateOwnProfile } from "@/server/profile";

type Listing = Tables<"marketplace_listings">;
type Profile = Omit<Tables<"student_profiles">, "email">;
type Transaction = Tables<"marketplace_transactions">;
type Notification = Tables<"marketplace_notifications">;
type Message = Tables<"marketplace_messages">;

type RouteView = "browse" | "auth" | "sell" | "transactions" | "messages" | "notifications" | "profile" | "admin";

const categories = ["All items", "Books & School Supplies", "Clothes & Accessories", "Gadgets & Electronics", "Sports & Outdoors", "Crafted & Collectibles", "Other"];
const conditions = ["New", "Like new", "Good", "Fair"];
const profileProjection =
  "user_id,first_name,last_name,school,program,year_level,profile_image,bio,is_banned,created_at,updated_at";
function nameOf(profile?: Profile | null) {
  if (!profile) return "Campus student";
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Campus student";
}

function priceOf(listing: Listing) {
  if (listing.price_type === "hidden") return "Price hidden";
  if (listing.price_type === "range") {
    return `${formatPeso(listing.price_min)} – ${formatPeso(listing.price_max)}`;
  }
  return formatPeso(listing.price);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export function CamFleaApp({ view }: { view: RouteView }) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [listings, setListings] = useState<Listing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All items");
  const [condition, setCondition] = useState("All conditions");
  const [sortBy, setSortBy] = useState("Newest first");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [searchRecipient, setSearchRecipient] = useState("");
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    const id = authData.user?.id ?? null;
    setUserId(id);

    const [{ data: availableListings, error: listingError }] = await Promise.all([
      supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false }),
    ]);
    if (listingError) console.error("Unable to load listings", listingError);
    setListings(availableListings ?? []);

    if (id) {
      const [profileResult, txResult, notificationResult, messageResult] = await Promise.all([
        supabase.from("student_profiles").select(profileProjection).eq("user_id", id).maybeSingle(),
        supabase.from("marketplace_transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("marketplace_notifications").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("marketplace_messages").select("*").order("created_at", { ascending: true }).limit(200),
      ]);
      setProfile(profileResult.data ?? null);
      setTransactions(txResult.data ?? []);
      setNotifications(notificationResult.data ?? []);
      setMessages(messageResult.data ?? []);
      const linkedIds = new Set<string>();
      (availableListings ?? []).forEach((listing) => linkedIds.add(listing.seller_id));
      (txResult.data ?? []).forEach((transaction) => {
        linkedIds.add(transaction.buyer_id);
        linkedIds.add(transaction.seller_id);
      });
      (messageResult.data ?? []).forEach((message) => {
        linkedIds.add(message.sender_id);
        linkedIds.add(message.recipient_id);
      });
      linkedIds.add(id);
      const profileResultAll = await supabase
        .from("student_profiles")
        .select(profileProjection)
        .in("user_id", [...linkedIds]);
      const profileMap = Object.fromEntries((profileResultAll.data ?? []).map((row) => [row.user_id, row]));
      setProfiles(profileMap);
      setProfile(profileMap[id] ?? profileResult.data ?? null);
    } else {
      setProfile(null);
      setTransactions([]);
      setNotifications([]);
      setMessages([]);
      setProfiles({});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        window.setTimeout(() => void loadData(), 0);
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, [loadData]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`camflea-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_transactions" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_messages" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_notifications" }, () => void loadData())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, loadData]);

  useEffect(() => {
    const previews = draftFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [draftFiles]);

  const visibleListings = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const result = listings.filter((item) => {
      if (item.status !== "available" && item.seller_id !== userId) return false;
      if (category !== "All items" && item.category !== category) return false;
      if (condition !== "All conditions" && item.condition !== condition) return false;
      if (normalized && !`${item.title} ${item.description} ${item.category} ${item.meeting_place}`.toLowerCase().includes(normalized)) return false;
      return true;
    });
    if (sortBy === "Price: low to high") result.sort((a, b) => (a.price ?? a.price_min ?? Number.MAX_SAFE_INTEGER) - (b.price ?? b.price_min ?? Number.MAX_SAFE_INTEGER));
    if (sortBy === "Price: high to low") result.sort((a, b) => (b.price ?? b.price_max ?? 0) - (a.price ?? a.price_max ?? 0));
    return result;
  }, [listings, search, category, condition, sortBy, userId]);

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  async function requireSignIn(message = "Sign in to continue") {
    if (userId) return true;
    toast(message);
    await navigate({ to: "/auth" });
    return false;
  }

  async function navigateAfterAuth() {
    const { data: authData } = await supabase.auth.getUser();
    const id = authData.user?.id;
    if (!id) {
      await navigate({ to: "/browse" });
      return;
    }
    const { data: isAdmin, error } = await supabase.rpc("has_role", {
      _user_id: id,
      _role: "admin",
    });
    if (error) {
      toast.error("Your account is signed in, but administrator access is still being verified.");
      return;
    }
    await navigate({ to: isAdmin ? "/admin" : "/browse" });
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const parsed = authMode === "sign-in"
      ? authInputSchema.signin.safeParse({ email, password })
      : authInputSchema.signup.safeParse({
          email,
          password,
          firstName: String(form.get("first_name") ?? "").trim(),
          lastName: String(form.get("last_name") ?? "").trim(),
        });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your account details.");
      return;
    }
    setBusy(true);
    if (authMode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else {
        toast.success("Welcome back to CamFlea");
        await navigateAfterAuth();
      }
    } else {
      const metadata = {
        first_name: String(form.get("first_name") ?? "").trim(),
        last_name: String(form.get("last_name") ?? "").trim(),
      };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata, emailRedirectTo: window.location.origin },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Check your email to confirm your student account.");
      else {
        toast.success("Your student account is ready");
        await navigateAfterAuth();
      }
    }
    setBusy(false);
  }

  async function addToCart(listing: Listing) {
    if (!(await requireSignIn())) return;
    if (listing.seller_id === userId) {
      toast.error("You can’t add your own listing");
      return;
    }
    const { error } = await supabase.rpc("marketplace_add_to_cart", { _listing_id: listing.id });
    if (error) toast.error(error.message);
    else {
      toast.success("Added to your cart");
      await loadData();
    }
  }

  async function transactionAction(transaction: Transaction, action: TransactionAction, reason?: string) {
    if (!userId) {
      toast.error("Sign in to continue");
      return;
    }
    if (!canTakeTransactionAction(transaction.status as Parameters<typeof canTakeTransactionAction>[0], action)) {
      toast.error("That transaction step is no longer available");
      return;
    }
    setBusy(true);
    if (action === "request") {
      const { error } = await supabase.rpc("marketplace_request_purchase", { _transaction_id: transaction.id });
      if (error) toast.error(error.message);
      else toast.success("Purchase request sent to the seller");
    } else {
      const { error } = await supabase.rpc(
        "marketplace_transition_transaction",
        reason
          ? { _transaction_id: transaction.id, _action: action, _reason: reason }
          : { _transaction_id: transaction.id, _action: action },
      );
      if (error) toast.error(error.message);
      else toast.success(action === "complete" ? "Sale completed" : "Transaction updated");
    }
    await loadData();
    setBusy(false);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>, recipientId: string, listingId?: string) {
    event.preventDefault();
    if (!(await requireSignIn("Sign in to message a student"))) return;
    const body = String(new FormData(event.currentTarget).get("body") ?? "").trim();
    if (!body || !userId) return;
    const { error } = await supabase.from("marketplace_messages").insert({ sender_id: userId, recipient_id: recipientId, listing_id: listingId ?? null, body });
    if (error) toast.error(error.message);
    else {
      event.currentTarget.reset();
      await loadData();
      toast.success("Message sent");
    }
  }

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(await requireSignIn("Sign in to post an item")) || !userId) return;
    const form = new FormData(event.currentTarget);
    const priceType = String(form.get("price_type") ?? "single");
    const id = crypto.randomUUID();
    const uploadedPaths: string[] = [];
    setBusy(true);
    for (const [index, file] of draftFiles.entries()) {
      const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
      const path = `${userId}/${id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("camflea-listings").upload(path, file, { upsert: false, contentType: file.type });
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
      uploadedPaths.push(path);
      if (index === draftFiles.length - 1) break;
    }
    const price = priceType === "single" ? Number(form.get("price")) : null;
    const priceMin = priceType === "range" ? Number(form.get("price_min")) : null;
    const priceMax = priceType === "range" ? Number(form.get("price_max")) : null;
    const { error } = await supabase.from("marketplace_listings").insert({
      id,
      seller_id: userId,
      title: String(form.get("title") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      category: String(form.get("category") ?? categories[1]),
      condition: String(form.get("condition") ?? "Good"),
      meeting_place: String(form.get("meeting_place") ?? "").trim(),
      price_type: priceType,
      price: Number.isFinite(price) ? price : null,
      price_min: Number.isFinite(priceMin) ? priceMin : null,
      price_max: Number.isFinite(priceMax) ? priceMax : null,
      photos: uploadedPaths,
    });
    if (error) {
      if (uploadedPaths.length) await supabase.storage.from("camflea-listings").remove(uploadedPaths);
      toast.error(error.message);
    } else {
      toast.success("Your item is now listed");
      setDraftFiles([]);
      await loadData();
      await navigate({ to: "/browse" });
    }
    setBusy(false);
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    const form = new FormData(event.currentTarget);
    try {
      await updateOwnProfile({
        data: {
          firstName: String(form.get("first_name") ?? ""),
          lastName: String(form.get("last_name") ?? ""),
          school: String(form.get("school") ?? ""),
          program: String(form.get("program") ?? ""),
          yearLevel: String(form.get("year_level") ?? ""),
          bio: String(form.get("bio") ?? ""),
        },
      });
      toast.success("Profile saved");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile.");
    }
  }

  async function submitReport(listing: Listing) {
    if (!(await requireSignIn("Sign in to report a listing")) || !userId) return;
    const reason = window.prompt("What is the concern with this listing?");
    if (!reason?.trim()) return;
    const { error } = await supabase.from("marketplace_reports").insert({ reporter_id: userId, listing_id: listing.id, reported_user_id: listing.seller_id, reason: reason.trim() });
    if (error) toast.error(error.message);
    else toast.success("Your report was sent for review");
  }

  async function markNotificationRead(notification: Notification) {
    const { error } = await supabase.rpc("marketplace_mark_notification_read", {
      _notification_id: notification.id,
    });
    if (!error) await loadData();
  }

  async function markAllNotificationsRead() {
    const { error } = await supabase.rpc("marketplace_mark_all_notifications_read");
    if (error) toast.error("Could not mark notifications as read.");
    else await loadData();
  }

  const avatarUrl = profile?.profile_image || "/camflea-assets/avatar-placeholder.png";

  if (view === "auth") {
    return (
      <main className="auth-page">
        <section className="auth-frame">
          <Link to="/" className="back-link"><ArrowLeft size={17} /> Back to CamFlea</Link>
          <div className="auth-card">
            <img src="/camflea-assets/logo.png" alt="CamFlea" className="auth-logo" />
            <p className="eyebrow">YOUR CAMPUS MARKETPLACE</p>
            <h1>{authMode === "sign-in" ? "Welcome back." : "Join your campus."}</h1>
            <p className="muted-copy">{authMode === "sign-in" ? "Find the good stuff, close to home." : "Buy and sell with students on campus."}</p>
            <form onSubmit={handleAuth} className="form-stack">
              {authMode === "sign-up" && <div className="form-row"><Field label="First name"><Input name="first_name" autoComplete="given-name" required /></Field><Field label="Last name"><Input name="last_name" autoComplete="family-name" required /></Field></div>}
              <Field label="School email"><Input name="email" type="email" autoComplete="email" placeholder="you@school.edu" required /></Field>
              <Field label="Password"><Input name="password" type="password" autoComplete={authMode === "sign-in" ? "current-password" : "new-password"} minLength={8} required /></Field>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : authMode === "sign-in" ? "Log in" : "Create account"}</Button>
            </form>
            {authMode === "sign-in" && <button className="text-command auth-forgot" onClick={async () => {
              const email = window.prompt("Enter your account email to receive a reset link");
              if (!email) return;
              const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
              if (error) toast.error(error.message); else toast.success("Password reset link sent");
            }}>Forgot password?</button>}
            <p className="auth-switch">{authMode === "sign-in" ? "New to CamFlea?" : "Already have an account?"} <button className="text-command" onClick={() => setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in")}>{authMode === "sign-in" ? "Create an account" : "Log in"}</button></p>
          </div>
          <p className="auth-note"><ShieldCheck size={15} /> For campus community members</p>
        </section>
      </main>
    );
  }

  return (
    <div className="legacy-route-content">
      <div className="main-stage">
          {view === "browse" && <section className="browse-view">
            <div className="page-heading browse-heading"><div><p className="eyebrow">CAMPUS FINDS, SECOND LIFE</p><h1>Find your next <em>good thing.</em></h1><p className="page-intro">A little closer. A lot more useful.</p></div><Button onClick={() => void navigate({ to: userId ? "/sell" : "/auth" })}><Plus size={17} /> Post an item</Button></div>
            <div className="category-strip" role="group" aria-label="Filter by category">{categories.map((value, index) => <button className={`category-chip ${category === value ? "selected" : ""}`} key={value} onClick={() => setCategory(value)}>{index === 1 && <BookOpen size={15} />}{value === "All items" ? "All items" : value.replace(" & School Supplies", "").replace(" & Accessories", "").replace(" & Electronics", "").replace(" & Outdoors", "").replace(" & Collectibles", "")}</button>)}</div>
            <div className="catalog-bar"><div><h2>{category === "All items" ? "Recently listed" : category}</h2><span>{visibleListings.length} {visibleListings.length === 1 ? "item" : "items"}</span></div><div className="catalog-tools"><div className="select-wrap"><Filter size={15} /><select aria-label="Filter condition" value={condition} onChange={(event) => setCondition(event.target.value)}><option>All conditions</option>{conditions.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></div><div className="select-wrap"><SlidersHorizontal size={15} /><select aria-label="Sort items" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option>Newest first</option><option>Price: low to high</option><option>Price: high to low</option></select><ChevronDown size={14} /></div></div></div>
            {loading ? <div className="empty-catalog"><div className="loading-mark"><span /><span /><span /></div><p>Finding the latest campus listings…</p></div> : visibleListings.length ? <div className="listing-grid">{visibleListings.map((item) => <ListingCard key={item.id} listing={item} seller={profiles[item.seller_id]} onOpen={() => setSelectedListing(item)} onCart={() => void addToCart(item)} onFavorite={() => toast("Sign in to save favorites")} />)}</div> : <div className="empty-catalog"><div className="empty-icon"><ShoppingBag size={25} /></div><h3>{search ? "No items match that search." : "The next great find hasn’t been posted yet."}</h3><p>{search ? "Try a different word or clear your filters." : "Start with what you don’t need anymore."}</p><Button variant="outline" onClick={() => void navigate({ to: userId ? "/sell" : "/auth" })}><Plus size={16} /> Post an item</Button></div>}
          </section>}

          {view === "sell" && <section className="content-view"><PageTitle eyebrow="GIVE IT A NEW HOME" title="Post an item" subtitle="Make space. Help someone find a good thing." /><form className="listing-form form-stack" onSubmit={createListing}>
            <div className="form-section"><h2>Item details</h2><div className="form-row"><Field label="Item name"><Input name="title" placeholder="e.g. Calculus textbook, 8th edition" required maxLength={100} /></Field><Field label="Category"><select name="category" className="native-select" required>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></Field></div><Field label="Description"><Textarea name="description" placeholder="What should a buyer know? Add details that make this item easy to find." required rows={5} maxLength={1500} /></Field><div className="form-row"><Field label="Condition"><select name="condition" className="native-select">{conditions.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Meet-up place"><Input name="meeting_place" placeholder="e.g. Main library entrance" required /></Field></div></div>
            <div className="form-section"><h2>Price</h2><Field label="Price style"><select name="price_type" className="native-select" onChange={(event) => { const single = document.getElementById("single-price"); const range = document.getElementById("range-price"); if (single && range) { single.hidden = event.target.value !== "single"; range.hidden = event.target.value !== "range"; } }}><option value="single">Set a price</option><option value="range">Price range</option><option value="hidden">Discuss price with buyer</option></select></Field><div id="single-price"><Field label="Price (₱)"><Input name="price" type="number" min="0" step="0.01" placeholder="0.00" required /></Field></div><div id="range-price" className="form-row" hidden><Field label="Minimum price (₱)"><Input name="price_min" type="number" min="0" step="0.01" /></Field><Field label="Maximum price (₱)"><Input name="price_max" type="number" min="0" step="0.01" /></Field></div></div>
            <div className="form-section"><h2>Photos</h2><p className="form-hint">Show the real item from a few clear angles.</p><label className="photo-drop"><input type="file" accept="image/*" multiple onChange={(event) => setDraftFiles(Array.from(event.target.files ?? []).slice(0, 5))} /><span className="photo-add"><Plus size={20} /></span><strong>Add photos</strong><span>Up to 5 images</span></label>{photoPreviews.length > 0 && <div className="photo-preview-grid">{photoPreviews.map((url, index) => <img key={url} src={url} alt={`Listing photo ${index + 1}`} />)}</div>}</div>
            <div className="listing-submit"><p>Your listing is visible to students browsing CamFlea.</p><Button type="submit" disabled={busy}>{busy ? "Posting…" : "Post item"}</Button></div>
          </form></section>}

          {view === "transactions" && <section className="content-view"><PageTitle eyebrow="THE DEALS YOU’RE MAKING" title="My transactions" subtitle="From the first request to hand-off." />{!userId ? <SignInPrompt onSignIn={() => void navigate({ to: "/auth" })} /> : <><div className="transaction-sections"><div className="section-head"><div><h2>Cart</h2><p>Items you’re thinking about</p></div><span className="section-count">{transactions.filter((transaction) => transaction.buyer_id === userId && transaction.status === "cart").length}</span></div><TransactionList entries={transactions.filter((transaction) => transaction.buyer_id === userId && transaction.status === "cart")} listings={listings} profiles={profiles} currentUser={userId} onAction={transactionAction} busy={busy} /></div><div className="transaction-sections"><div className="section-head"><div><h2>Currently buying & selling</h2><p>Your active hand-offs</p></div><span className="section-count">{transactions.filter((transaction) => ["requested", "sent", "received"].includes(transaction.status)).length}</span></div><TransactionList entries={transactions.filter((transaction) => ["requested", "sent", "received"].includes(transaction.status) && (transaction.buyer_id === userId || transaction.seller_id === userId))} listings={listings} profiles={profiles} currentUser={userId} onAction={transactionAction} busy={busy} /></div><div className="transaction-sections"><div className="section-head"><div><h2>Completed</h2><p>Good finds, good hand-offs</p></div></div><TransactionList entries={transactions.filter((transaction) => transaction.status === "completed" && (transaction.buyer_id === userId || transaction.seller_id === userId))} listings={listings} profiles={profiles} currentUser={userId} onAction={transactionAction} busy={busy} /></div></>}</section>}

          {view === "messages" && <section className="content-view"><PageTitle eyebrow="BETTER DEALS START WITH A NOTE" title="Messages" subtitle="Ask a question. Find a meet-up time. Make it easy." />{!userId ? <SignInPrompt onSignIn={() => void navigate({ to: "/auth" })} /> : <MessageCenter messages={messages} profiles={profiles} listings={listings} currentUser={userId} onSend={sendMessage} />}</section>}

          {view === "notifications" && <section className="content-view"><PageTitle eyebrow="A LITTLE CAMPUS UPDATE" title="Notifications" subtitle="Requests, replies, and the details that move a deal along." />{!userId ? <SignInPrompt onSignIn={() => void navigate({ to: "/auth" })} /> : notifications.length ? <><NotificationToolbar unreadCount={unreadCount} onMarkAllRead={() => void markAllNotificationsRead()} /><div className="notification-list">{notifications.map((item) => <button className={`notification-row ${item.is_read ? "read" : "unread"}`} key={item.id} onClick={() => void markNotificationRead(item)}><span className="notification-symbol"><Bell size={17} /></span><span className="notification-copy"><strong>{item.content}</strong><span>{item.kind.replaceAll("_", " ")} · {shortDate(item.created_at)}</span></span>{!item.is_read && <span className="notification-unread" />}</button>)}</div></> : <EmptyState icon={<Bell size={24} />} title="You’re all caught up." copy="New requests and messages will show up here." />}</section>}

          {view === "profile" && <section className="content-view"><PageTitle eyebrow="YOUR CAMPUS, YOUR PROFILE" title="My profile" subtitle="The details other students see when you trade." />{!userId ? <SignInPrompt onSignIn={() => void navigate({ to: "/auth" })} /> : profile ? <form className="profile-form form-stack" onSubmit={updateProfile}><div className="profile-banner"><img src={avatarUrl} alt="Profile" /><div><strong>{nameOf(profile)}</strong><span>{profile.school || "School not added"}</span></div><span className="member-chip"><ShieldCheck size={14} /> Student member</span></div><div className="form-section"><h2>About you</h2><div className="form-row"><Field label="First name"><Input name="first_name" defaultValue={profile.first_name} required /></Field><Field label="Last name"><Input name="last_name" defaultValue={profile.last_name} required /></Field></div><Field label="School"><Input name="school" defaultValue={profile.school ?? ""} placeholder="School or campus" /></Field><div className="form-row"><Field label="Program"><Input name="program" defaultValue={profile.program ?? ""} placeholder="Program / department" /></Field><Field label="Year level"><Input name="year_level" defaultValue={profile.year_level ?? ""} placeholder="e.g. 2nd year" /></Field></div><Field label="A little about you"><Textarea name="bio" defaultValue={profile.bio ?? ""} rows={4} placeholder="What are you studying? What do you enjoy finding?" /></Field></div><div className="profile-email"><Mail size={17} /><span><strong>Account email</strong><span>Managed securely by your sign-in account</span></span></div><Button type="submit">Save profile</Button></form> : <EmptyState icon={<CircleUserRound size={24} />} title="Finishing your profile…" copy="Your student profile is being prepared." />}</section>}

          {view === "admin" && <section className="content-view"><PageTitle eyebrow="CAMPUS CARE" title="Admin desk" subtitle="Keep the CamFlea marketplace safe and useful." />{!userId ? <SignInPrompt onSignIn={() => void navigate({ to: "/auth" })} /> : <AdminDesk listings={listings} transactions={transactions} />}</section>}
      </div>

      {selectedListing && <ListingDetail listing={selectedListing} seller={profiles[selectedListing.seller_id]} currentUser={userId} onClose={() => setSelectedListing(null)} onCart={() => void addToCart(selectedListing)} onReport={() => void submitReport(selectedListing)} onSendMessage={(event) => void sendMessage(event, selectedListing.seller_id, selectedListing.id)} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field-wrap"><Label>{label}</Label>{children}</div>;
}

function PageTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="page-heading content-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-intro">{subtitle}</p></div></div>;
}

export function NotificationToolbar({
  unreadCount,
  onMarkAllRead,
}: {
  unreadCount: number;
  onMarkAllRead: () => void;
}) {
  return <div className="notification-toolbar"><span>{unreadCount} unread</span>{unreadCount > 0 && <Button variant="outline" size="sm" onClick={onMarkAllRead}>Mark all as read</Button>}</div>;
}

function ListingCard({ listing, seller, onOpen, onCart, onFavorite }: { listing: Listing; seller?: Profile | undefined; onOpen: () => void; onCart: () => void; onFavorite: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const path = listing.photos?.[0];
    if (!path) { setImage(null); return; }
    if (/^https?:\/\//.test(path)) { setImage(path); return; }
    void supabase.storage.from("camflea-listings").createSignedUrl(path, 3600).then(({ data }) => { if (active) setImage(data?.signedUrl ?? null); });
    return () => { active = false; };
  }, [listing.photos]);
  return <article className="listing-card"><button className="listing-image-button" onClick={onOpen} aria-label={`View ${listing.title}`}><div className={`listing-image ${image ? "has-image" : ""}`}>{image ? <img src={image} alt={listing.title} /> : <span className="image-placeholder"><Tag size={25} /></span>}<span className="condition-pill">{listing.condition}</span></div></button><div className="listing-card-body"><button className="listing-name" onClick={onOpen}>{listing.title}</button><div className="listing-price">{priceOf(listing)}</div><div className="listing-card-meta"><span>{listing.category.split(" & ")[0]}</span><span className="meta-dot">·</span><span>{shortDate(listing.created_at)}</span></div><div className="seller-line"><img src={seller?.profile_image || "/camflea-assets/avatar-placeholder.png"} alt="" /><span>{nameOf(seller)}</span><button className="favorite-button" onClick={onFavorite} aria-label="Save listing"><Heart size={16} /></button></div><Button size="sm" variant="outline" className="listing-action" onClick={onCart}><ShoppingCart size={15} /> Add to cart</Button></div></article>;
}

function ListingDetail({ listing, seller, currentUser, onClose, onCart, onReport, onSendMessage }: { listing: Listing; seller?: Profile | undefined; currentUser: string | null; onClose: () => void; onCart: () => void; onReport: () => void; onSendMessage: (event: FormEvent<HTMLFormElement>) => void }) {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    const path = listing.photos?.[0];
    if (!path) { setImage(null); return; }
    if (/^https?:\/\//.test(path)) { setImage(path); return; }
    void supabase.storage.from("camflea-listings").createSignedUrl(path, 3600).then(({ data }) => setImage(data?.signedUrl ?? null));
  }, [listing.photos]);
  return <div className="detail-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title"><Button variant="ghost" size="icon" aria-label="Close item details" className="detail-close" onClick={onClose}><X /></Button><div className="detail-photo">{image ? <img src={image} alt={listing.title} /> : <Tag size={38} />}</div><div className="detail-content"><span className="eyebrow">{listing.category} · {listing.condition}</span><h2 id="detail-title">{listing.title}</h2><strong className="detail-price">{priceOf(listing)}</strong><p className="detail-description">{listing.description}</p><div className="detail-seller"><img src={seller?.profile_image || "/camflea-assets/avatar-placeholder.png"} alt="" /><span><strong>{nameOf(seller)}</strong><span>{seller?.school || "CamFlea student"}</span></span><span className="seller-rating"><Star size={14} /> Campus seller</span></div><div className="meetup-line"><span>MEET-UP PLACE</span><strong>{listing.meeting_place}</strong></div>{currentUser && currentUser !== listing.seller_id && <><Button className="w-full" onClick={onCart}><ShoppingCart size={16} /> Add to cart</Button><form className="message-seller-form" onSubmit={onSendMessage}><Label htmlFor="seller-message">Message the seller</Label><div><Input id="seller-message" name="body" placeholder="Ask a question or suggest a meet-up" required /><Button variant="outline" type="submit" aria-label="Send seller a message"><MessageCircle size={16} /></Button></div></form></>}{!currentUser && <p className="detail-signin">Log in to start a conversation or add this item to your cart.</p>}<button className="text-command report-command" onClick={onReport}>Report this listing</button></div></section></div>;
}

function TransactionList({ entries, listings, profiles, currentUser, onAction, busy }: { entries: Transaction[]; listings: Listing[]; profiles: Record<string, Profile>; currentUser: string; onAction: (transaction: Transaction, action: TransactionAction, reason?: string) => void; busy: boolean }) {
  if (!entries.length) return <div className="transaction-empty"><PackageCheck size={20} /><span>No transactions in this section.</span></div>;
  return <div className="transaction-list">{entries.map((transaction) => {
    const item = listings.find((listing) => listing.id === transaction.listing_id);
    const isBuyer = transaction.buyer_id === currentUser;
    const otherPerson = profiles[isBuyer ? transaction.seller_id : transaction.buyer_id];
    const actions: { key: TransactionAction; text: string; style?: "default" | "outline" }[] = [];
    if (isBuyer && transaction.status === "cart") actions.push({ key: "request", text: "Request to buy" });
    if (!isBuyer && transaction.status === "requested") actions.push({ key: "accept", text: "Accept request" });
    if (isBuyer && transaction.status === "sent") actions.push({ key: "received", text: "Mark as received" });
    if (!isBuyer && transaction.status === "received") actions.push({ key: "complete", text: "Complete sale" });
    if (["cart", "requested", "sent", "received"].includes(transaction.status)) actions.push({ key: "cancel", text: "Cancel", style: "outline" });
    return <article className="transaction-row" key={transaction.id}><div className="transaction-thumb">{item?.photos?.[0] ? <TransactionImage path={item.photos[0]} label={item.title} /> : <ShoppingBag size={22} />}</div><div className="transaction-info"><div className="transaction-title-line"><strong>{item?.title ?? "CamFlea listing"}</strong><span className={`status-pill status-${transaction.status}`}>{transaction.status}</span></div><span>{item ? priceOf(item) : "Listing unavailable"} <span className="meta-dot">·</span> {isBuyer ? "Seller" : "Buyer"}: {nameOf(otherPerson)}</span><small>Started {shortDate(transaction.created_at)}</small></div><div className="transaction-controls">{actions.map(({ key, text, style }) => <Button key={key} size="sm" variant={style ?? "default"} disabled={busy} onClick={() => { const reason = key === "cancel" ? window.prompt("Optional: share a reason with the other student") ?? "" : undefined; if (key !== "cancel" || reason !== null) onAction(transaction, key, reason); }}>{key === "complete" && <Check size={14} />}{text}</Button>)}</div></article>;
  })}</div>;
}

function TransactionImage({ path, label }: { path: string; label: string }) {
  const [url, setUrl] = useState<string | null>(/^https?:\/\//.test(path) ? path : null);
  useEffect(() => { if (/^https?:\/\//.test(path)) return; let active = true; void supabase.storage.from("camflea-listings").createSignedUrl(path, 3600).then(({ data }) => { if (active) setUrl(data?.signedUrl ?? null); }); return () => { active = false; }; }, [path]);
  return url ? <img src={url} alt={label} /> : <Tag size={22} />;
}

function MessageCenter({ messages, profiles, listings, currentUser, onSend }: { messages: Message[]; profiles: Record<string, Profile>; listings: Listing[]; currentUser: string; onSend: (event: FormEvent<HTMLFormElement>, recipientId: string, listingId?: string) => void }) {
  const participants = useMemo(() => {
    const ids = new Set<string>();
    messages.forEach((message) => { ids.add(message.sender_id); ids.add(message.recipient_id); });
    ids.delete(currentUser);
    return [...ids];
  }, [messages, currentUser]);
  const [activeId, setActiveId] = useState("");
  const selectedId = participants.includes(activeId) ? activeId : participants[0] ?? "";
  const thread = messages.filter((message) => (message.sender_id === currentUser && message.recipient_id === selectedId) || (message.sender_id === selectedId && message.recipient_id === currentUser));
  const linkedListing = listings.find((listing) => thread.some((message) => message.listing_id === listing.id));
  return <div className="message-layout"><aside className="thread-list"><div className="thread-list-title"><MessageCircle size={16} /><strong>Conversations</strong><span>{participants.length}</span></div>{participants.length ? participants.map((id) => <button key={id} className={`thread-entry ${selectedId === id ? "selected" : ""}`} onClick={() => setActiveId(id)}><img src={profiles[id]?.profile_image || "/camflea-assets/avatar-placeholder.png"} alt="" /><span><strong>{nameOf(profiles[id])}</strong><small>{messages.filter((message) => message.sender_id === id || message.recipient_id === id).at(-1)?.body ?? ""}</small></span></button>) : <div className="thread-empty"><Mail size={20} /><span>No conversations yet.</span></div>}</aside><section className="thread-panel">{selectedId ? <><div className="thread-header"><img src={profiles[selectedId]?.profile_image || "/camflea-assets/avatar-placeholder.png"} alt="" /><span><strong>{nameOf(profiles[selectedId])}</strong><small>{linkedListing?.title ?? "CamFlea conversation"}</small></span></div><div className="message-stream">{thread.map((message) => <div key={message.id} className={`message-bubble ${message.sender_id === currentUser ? "mine" : "theirs"}`}><p>{message.body}</p><small>{shortDate(message.created_at)}</small></div>)}</div><form className="message-composer" onSubmit={(event) => onSend(event, selectedId, linkedListing?.id)}><Input name="body" aria-label="Message" placeholder="Write a message…" required /><Button type="submit" aria-label="Send message"><MessageCircle size={17} /></Button></form></> : <EmptyState icon={<MessageCircle size={24} />} title="A good conversation can start here." copy="Open a listing and message the seller with a question or meet-up idea." />}</section></div>;
}

function AdminDesk({ listings, transactions }: { listings: Listing[]; transactions: Transaction[] }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Tables<"marketplace_reports">[]>([]);
  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id;
      if (!id) { setAllowed(false); return; }
      const [adminRole, moderatorRole] = await Promise.all([
        supabase.rpc("has_role", { _user_id: id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: id, _role: "moderator" }),
      ]);
      if (!adminRole.data && !moderatorRole.data) { setAllowed(false); return; }
      setAllowed(true);
      const reportResult = await supabase.from("marketplace_reports").select("*").order("created_at", { ascending: false }).limit(100);
      setReports(reportResult.data ?? []);
    });
  }, []);
  if (allowed === null) return <EmptyState icon={<ShieldCheck size={24} />} title="Checking staff access…" copy="Only designated CamFlea staff can review reports." />;
  if (!allowed) return <EmptyState icon={<ShieldCheck size={24} />} title="Staff access only." copy="This desk is available to CamFlea administrators." />;
  return <><div className="stat-grid"><StatCard label="Live listings" value={String(listings.filter((item) => item.status === "available").length)} icon={<Tag size={18} />} /><StatCard label="Transactions" value={String(transactions.length)} icon={<ShoppingBag size={18} />} /><StatCard label="Open reports" value={String(reports.filter((report) => report.status === "open").length)} icon={<ShieldCheck size={18} />} /></div><div className="form-section admin-reports"><h2>Community reports</h2>{reports.length ? reports.map((report) => <div className="report-row" key={report.id}><div><strong>{report.reason}</strong><p>{report.details || "No additional details"}</p><small>{shortDate(report.created_at)} · {report.status}</small></div><Button variant="outline" size="sm" onClick={() => void supabase.from("marketplace_reports").update({ status: "reviewed" }).eq("id", report.id).then(({ error }) => { if (error) toast.error(error.message); else setReports((rows) => rows.map((row) => row.id === report.id ? { ...row, status: "reviewed" } : row)); })}>Mark reviewed</Button></div>) : <p className="muted-copy">No reports to review.</p>}</div></>;
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <article className="stat-card"><span className="stat-icon">{icon}</span><span>{label}</span><strong>{value}</strong></article>;
}

function SignInPrompt({ onSignIn }: { onSignIn: () => void }) {
  return <div className="signin-prompt"><CircleUserRound size={26} /><h2>Sign in to see your activity.</h2><p>Your transactions and conversations are only visible to you and the other student.</p><Button onClick={onSignIn}>Log in</Button></div>;
}

function EmptyState({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{copy}</p></div>;
}
