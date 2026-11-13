import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  Ban,
  Check,
  CircleAlert,
  Pin,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { ConfirmAction } from "@/components/confirm-action";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AdminAnalyticsChart,
  type AdminChartKind,
  type AdminChartLabelKind,
} from "@/features/admin/admin-analytics-chart";
import {
  adminDeleteListing,
  adminSetAccountStatus,
  adminSetListingFlags,
  adminWarnUser,
  loadAdminWorkspace,
  type AdminWorkspaceData,
} from "@/features/admin/admin-actions";
import type {
  AdminDistribution,
  AdminListing,
  AdminReport,
  AdminTransaction,
  AdminUser,
} from "@/features/admin/admin-dashboard-data";
import { reviewAdminReport } from "@/features/admin/report-actions";

export type AdminTab = "dashboard" | "users" | "items" | "transactions" | "reports";

type LoadWorkspace = () => Promise<AdminWorkspaceData>;
type WarnUser = (input: { userId: string; reason?: string }) => Promise<{ warningCount: number }>;
type SetAccountStatus = (input: {
  userId: string;
  status: "active" | "restricted" | "banned";
  reason?: string;
}) => Promise<{ success: boolean }>;
type SetListingFlags = (input: {
  listingId: string;
  isPinned: boolean;
  isVerified: boolean;
}) => Promise<{ success: boolean }>;
type DeleteListing = (input: {
  listingId: string;
  reason?: string;
}) => Promise<{ success: boolean }>;
type ReviewReport = (input: {
  id: string;
  status: "open" | "reviewed" | "dismissed";
}) => Promise<{ id: string }>;

const defaultLoadWorkspace: LoadWorkspace = () => loadAdminWorkspace();
const defaultWarnUser: WarnUser = (input) => adminWarnUser({ data: input });
const defaultSetAccountStatus: SetAccountStatus = (input) => adminSetAccountStatus({ data: input });
const defaultSetListingFlags: SetListingFlags = (input) => adminSetListingFlags({ data: input });
const defaultDeleteListing: DeleteListing = (input) => adminDeleteListing({ data: input });
const defaultReviewReport: ReviewReport = (input) => reviewAdminReport({ data: input });

export function AdminDashboard({
  tab: activeTab = "dashboard",
  loadWorkspace = defaultLoadWorkspace,
  warnUser = defaultWarnUser,
  setAccountStatus = defaultSetAccountStatus,
  setListingFlags = defaultSetListingFlags,
  deleteListing = defaultDeleteListing,
  reviewReport = defaultReviewReport,
}: {
  tab?: AdminTab;
  loadWorkspace?: LoadWorkspace;
  warnUser?: WarnUser;
  setAccountStatus?: SetAccountStatus;
  setListingFlags?: SetListingFlags;
  deleteListing?: DeleteListing;
  reviewReport?: ReviewReport;
}) {
  const [workspace, setWorkspace] = useState<AdminWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void loadWorkspace()
      .then((data) => {
        if (active) setWorkspace(data);
      })
      .catch(() => {
        if (active)
          setError("Unable to load the admin workspace. Check your administrator access.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadWorkspace, refreshKey]);

  async function runAction(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      setRefreshKey((key) => key + 1);
    } catch {
      setError("The admin action could not be completed. Refresh and try again.");
    }
  }

  return (
    <section className="admin-workspace content-view">
      <header className="admin-workspace-header page-heading">
        <div>
          <p className="eyebrow">CAMFLEA ADMINISTRATION</p>
          <h1>Admin dashboard</h1>
          <p className="page-intro">
            Manage the student marketplace from one secure workspace, with the same operational
            areas as the legacy admin panel.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
        >
          <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </header>

      {error ? (
        <div className="admin-alert" role="alert">
          <span>
            <AlertCircle aria-hidden="true" /> {error}
          </span>
          <Button type="button" variant="outline" onClick={() => setRefreshKey((key) => key + 1)}>
            Retry
          </Button>
        </div>
      ) : null}

      {loading && !workspace ? <p role="status">Loading admin dashboard…</p> : null}
      {!loading && !workspace && !error ? <p role="status">No admin data is available.</p> : null}

      {workspace ? (
        <div className="admin-tabpanel">
          {activeTab === "dashboard" ? <DashboardOverview data={workspace} /> : null}
          {activeTab === "users" ? (
            <UserManagement
              users={workspace.users}
              onAction={runAction}
              warnUser={warnUser}
              setAccountStatus={setAccountStatus}
            />
          ) : null}
          {activeTab === "items" ? (
            <ItemManagement
              listings={workspace.listings}
              onAction={runAction}
              setListingFlags={setListingFlags}
              deleteListing={deleteListing}
            />
          ) : null}
          {activeTab === "transactions" ? (
            <TransactionMonitoring
              transactions={workspace.transactions}
              users={workspace.users}
              listings={workspace.listings}
            />
          ) : null}
          {activeTab === "reports" ? (
            <ReportsCenter
              reports={workspace.reports}
              onAction={runAction}
              reviewReport={reviewReport}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function DashboardOverview({ data }: { data: AdminWorkspaceData }) {
  const { analytics } = data;
  return (
    <div className="admin-dashboard-content">
      <div className="admin-kpi-grid">
        <MetricCard
          label="Total users"
          value={data.users.length}
          icon={<UserRound aria-hidden="true" />}
        />
        <MetricCard
          label="Available items"
          value={data.listings.filter((listing) => listing.status === "available").length}
          icon={<Pin aria-hidden="true" />}
        />
        <MetricCard
          label="Transactions"
          value={data.transactions.length}
          icon={<Check aria-hidden="true" />}
        />
        <MetricCard
          label="Open reports"
          value={data.reports.filter((report) => report.status === "open").length}
          icon={<ShieldCheck aria-hidden="true" />}
        />
      </div>

      <AnalyticsSection
        title="User analytics"
        distributions={[analytics.usersByYear, analytics.studentsByProgram]}
        labels={["Users by year level", "Students by program"]}
        kinds={["column", "bar"]}
        valueLabels={["Users", "Students"]}
        categoryLabels={["Year level", "Program"]}
        labelKinds={["default", "default"]}
      />
      <AnalyticsSection
        title="Marketplace analytics"
        distributions={[
          analytics.listingsByCategory,
          analytics.listingsByStatus,
          analytics.listingsByCondition,
        ]}
        labels={["Items by type", "Items by status", "Items by condition"]}
        kinds={["bar", "donut", "column"]}
        valueLabels={["Listings", "Listings", "Listings"]}
        categoryLabels={["Item type", "Status", "Condition"]}
        labelKinds={["default", "listing-status", "default"]}
      />
      <AnalyticsSection
        title="Pricing analytics"
        distributions={[analytics.listingsByPriceRange, analytics.listingsByPriceType]}
        labels={["Items by price range", "Price type distribution"]}
        kinds={["column", "donut"]}
        valueLabels={["Listings", "Listings"]}
        categoryLabels={["Price range", "Price type"]}
        labelKinds={["default", "price-type"]}
      />
      <AnalyticsSection
        title="Transaction analytics"
        distributions={[analytics.transactionsByStatus]}
        labels={["Transaction status"]}
        kinds={["donut"]}
        valueLabels={["Transactions"]}
        categoryLabels={["Transaction status"]}
        labelKinds={["transaction-status"]}
      />
      <section className="admin-analytics-section" aria-labelledby="admin-trends-heading">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Trends & reports</p>
            <h2 id="admin-trends-heading">Trends & reports</h2>
          </div>
          <span className="admin-analytics-note">
            {analytics.averageDaysToSell === null
              ? "No completed sales yet"
              : `${analytics.averageDaysToSell} average days to sell`}
          </span>
        </div>
        <div className="admin-analytics-grid">
          <DistributionCard
            title="Listing trends over time"
            values={analytics.listingsByMonth}
            kind="area"
            valueLabel="Listings"
            categoryLabel="Month"
            labelKind="month"
          />
          <DistributionCard
            title="Reports by violation type"
            values={analytics.reportsByReason}
            kind="bar"
            valueLabel="Reports"
            categoryLabel="Violation type"
          />
        </div>
      </section>
    </div>
  );
}

function AnalyticsSection({
  title,
  distributions,
  labels,
  kinds,
  valueLabels,
  categoryLabels,
  labelKinds,
}: {
  title: string;
  distributions: AdminDistribution[][];
  labels: string[];
  kinds: AdminChartKind[];
  valueLabels: string[];
  categoryLabels: string[];
  labelKinds: AdminChartLabelKind[];
}) {
  return (
    <section className="admin-analytics-section" aria-labelledby={`section-${title}`}>
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Analytics</p>
          <h2 id={`section-${title}`}>{title}</h2>
        </div>
      </div>
      <div className="admin-analytics-grid">
        {distributions.map((values, index) => (
          <DistributionCard
            key={labels[index]}
            title={labels[index]}
            values={values}
            kind={kinds[index] ?? "bar"}
            valueLabel={valueLabels[index] ?? "Values"}
            categoryLabel={categoryLabels[index] ?? "Category"}
            labelKind={labelKinds[index] ?? "default"}
          />
        ))}
      </div>
    </section>
  );
}

function DistributionCard({
  title,
  values,
  kind,
  valueLabel,
  categoryLabel,
  labelKind,
}: {
  title: string;
  values: AdminDistribution[];
  kind: AdminChartKind;
  valueLabel: string;
  categoryLabel: string;
  labelKind?: AdminChartLabelKind;
}) {
  return (
    <Card className="admin-distribution-card">
      <h3>{title}</h3>
      <AdminAnalyticsChart
        title={title}
        values={values}
        kind={kind}
        valueLabel={valueLabel}
        categoryLabel={categoryLabel}
        labelKind={labelKind}
      />
    </Card>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <Card className="admin-metric-card">
      <span className="admin-metric-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </Card>
  );
}

function UserManagement({
  users,
  onAction,
  warnUser,
  setAccountStatus,
}: {
  users: AdminUser[];
  onAction: (action: () => Promise<unknown>) => Promise<void>;
  warnUser: WarnUser;
  setAccountStatus: SetAccountStatus;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [school, setSchool] = useState("all");
  const schools = [
    ...new Set(users.map((user) => user.school).filter((value): value is string => Boolean(value))),
  ].sort();
  const visibleUsers = users.filter((user) => {
    const haystack = `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase();
    return (
      (!search.trim() || haystack.includes(search.trim().toLowerCase())) &&
      (status === "all" || user.status === status) &&
      (school === "all" || user.school === school)
    );
  });

  return (
    <section className="admin-table-section" aria-labelledby="user-management-heading">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Legacy admin tab</p>
          <h2 id="user-management-heading">User management</h2>
          <p>Search student accounts and apply audited moderation actions.</p>
        </div>
      </div>
      <div className="admin-filter-row">
        <Label>
          Search users
          <Input
            aria-label="Search users"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or email"
          />
        </Label>
        <Label>
          Status
          <select
            aria-label="Filter users by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="restricted">Restricted</option>
            <option value="banned">Banned</option>
          </select>
        </Label>
        <Label>
          School
          <select
            aria-label="Filter users by school"
            value={school}
            onChange={(event) => setSchool(event.target.value)}
          >
            <option value="all">All schools</option>
            {schools.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Label>
      </div>
      <div className="admin-record-list">
        {visibleUsers.length ? (
          visibleUsers.map((user) => (
            <UserRecord
              key={user.user_id}
              user={user}
              onAction={onAction}
              warnUser={warnUser}
              setAccountStatus={setAccountStatus}
            />
          ))
        ) : (
          <Card className="admin-empty-card">No users match these filters.</Card>
        )}
      </div>
    </section>
  );
}

function UserRecord({
  user,
  onAction,
  warnUser,
  setAccountStatus,
}: {
  user: AdminUser;
  onAction: (action: () => Promise<unknown>) => Promise<void>;
  warnUser: WarnUser;
  setAccountStatus: SetAccountStatus;
}) {
  const nextStatus =
    user.status === "banned" ? "active" : user.status === "restricted" ? "active" : "restricted";
  return (
    <Card className="admin-record-card">
      <div>
        <strong>
          {user.first_name} {user.last_name}
        </strong>
        <span>{user.email}</span>
        <small>
          {user.school || "School not provided"} · {user.program || "Program not provided"} ·{" "}
          {user.status} · {user.warning_count} warnings
        </small>
      </div>
      <div className="admin-record-actions">
        <ConfirmAction
          description={`Warn ${user.first_name} ${user.last_name}? This will add a moderation warning to their account.`}
          confirmLabel="Warn user"
          reasonLabel="Optional warning reason"
          onConfirm={(reason) =>
            onAction(() => warnUser({ userId: user.user_id, reason: reason || "Admin warning" }))
          }
        >
          <Button type="button" variant="outline">
            <CircleAlert aria-hidden="true" /> Warn
          </Button>
        </ConfirmAction>
        {nextStatus === "active" ? (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void onAction(() =>
                setAccountStatus({
                  userId: user.user_id,
                  status: nextStatus,
                  reason: `${nextStatus} by administrator`,
                }),
              )
            }
          >
            Restore
          </Button>
        ) : (
          <ConfirmAction
            description={`Restrict ${user.first_name} ${user.last_name}? They will lose normal marketplace access until restored.`}
            confirmLabel="Restrict"
            onConfirm={() =>
              onAction(() =>
                setAccountStatus({
                  userId: user.user_id,
                  status: nextStatus,
                  reason: `${nextStatus} by administrator`,
                }),
              )
            }
          >
            <Button type="button" variant="outline">
              Restrict
            </Button>
          </ConfirmAction>
        )}
        <ConfirmAction
          description={`Ban ${user.first_name} ${user.last_name}? They will be blocked from CamFlea.`}
          confirmLabel="Ban user"
          onConfirm={() =>
            onAction(() =>
              setAccountStatus({
                userId: user.user_id,
                status: "banned",
                reason: "Banned by administrator",
              }),
            )
          }
        >
          <Button type="button" variant="outline">
            <Ban aria-hidden="true" /> Ban
          </Button>
        </ConfirmAction>
      </div>
    </Card>
  );
}

function ItemManagement({
  listings,
  onAction,
  setListingFlags,
  deleteListing,
}: {
  listings: AdminListing[];
  onAction: (action: () => Promise<unknown>) => Promise<void>;
  setListingFlags: SetListingFlags;
  deleteListing: DeleteListing;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const categories = [...new Set(listings.map((listing) => listing.category))].sort();
  const visibleListings = listings.filter(
    (listing) =>
      (!search.trim() ||
        `${listing.title} ${listing.description}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())) &&
      (status === "all" || listing.status === status) &&
      (category === "all" || listing.category === category),
  );
  return (
    <section className="admin-table-section" aria-labelledby="item-management-heading">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Legacy admin tab</p>
          <h2 id="item-management-heading">Post & item management</h2>
          <p>Review marketplace inventory, feature trusted posts, and remove unsafe listings.</p>
        </div>
      </div>
      <div className="admin-filter-row">
        <Label>
          Search items
          <Input
            aria-label="Search items"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title or description"
          />
        </Label>
        <Label>
          Status
          <select
            aria-label="Filter items by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
          </select>
        </Label>
        <Label>
          Category
          <select
            aria-label="Filter items by category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Label>
      </div>
      <div className="admin-record-list">
        {visibleListings.length ? (
          visibleListings.map((listing) => (
            <ItemRecord
              key={listing.id}
              listing={listing}
              onAction={onAction}
              setListingFlags={setListingFlags}
              deleteListing={deleteListing}
            />
          ))
        ) : (
          <Card className="admin-empty-card">No listings match these filters.</Card>
        )}
      </div>
    </section>
  );
}

function ItemRecord({
  listing,
  onAction,
  setListingFlags,
  deleteListing,
}: {
  listing: AdminListing;
  onAction: (action: () => Promise<unknown>) => Promise<void>;
  setListingFlags: SetListingFlags;
  deleteListing: DeleteListing;
}) {
  return (
    <Card className="admin-record-card">
      <div>
        <strong>{listing.title}</strong>
        <span>
          {listing.category} · {listing.condition} · {listing.status}
        </span>
        <small>
          {listing.is_pinned ? "Pinned" : "Not pinned"} ·{" "}
          {listing.is_verified ? "Verified" : "Unverified"}
        </small>
      </div>
      <div className="admin-record-actions">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void onAction(() =>
              setListingFlags({
                listingId: listing.id,
                isPinned: !listing.is_pinned,
                isVerified: listing.is_verified,
              }),
            )
          }
        >
          <Pin aria-hidden="true" /> {listing.is_pinned ? "Unpin" : "Pin"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void onAction(() =>
              setListingFlags({
                listingId: listing.id,
                isPinned: listing.is_pinned,
                isVerified: !listing.is_verified,
              }),
            )
          }
        >
          {listing.is_verified ? "Unverify" : "Verify"}
        </Button>
        <ConfirmAction
          description={`Remove "${listing.title}"? This deletes the listing for everyone.`}
          confirmLabel="Remove listing"
          onConfirm={() =>
            onAction(() =>
              deleteListing({ listingId: listing.id, reason: "Removed by administrator" }),
            )
          }
        >
          <Button type="button" variant="outline">
            <Trash2 aria-hidden="true" /> Remove
          </Button>
        </ConfirmAction>
      </div>
    </Card>
  );
}

function TransactionMonitoring({
  transactions,
  users,
  listings,
}: {
  transactions: AdminTransaction[];
  users: AdminUser[];
  listings: AdminListing[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const userNames = new Map(
    users.map((user) => [user.user_id, `${user.first_name} ${user.last_name}`]),
  );
  const listingNames = new Map(listings.map((listing) => [listing.id, listing.title]));
  const visibleTransactions = transactions.filter(
    (transaction) =>
      (status === "all" || transaction.status === status) &&
      (!search.trim() ||
        `${transaction.id} ${userNames.get(transaction.buyer_id) ?? ""} ${userNames.get(transaction.seller_id) ?? ""} ${listingNames.get(transaction.listing_id) ?? transaction.listing_title_snapshot ?? ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())),
  );
  return (
    <section className="admin-table-section" aria-labelledby="transaction-monitoring-heading">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Legacy admin tab</p>
          <h2 id="transaction-monitoring-heading">Transaction monitoring</h2>
          <p>Search the full purchase flow, including participants and current status.</p>
        </div>
      </div>
      <div className="admin-filter-row">
        <Label>
          Search transactions
          <Input
            aria-label="Search transactions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ID, buyer, seller, or item"
          />
        </Label>
        <Label>
          Status
          <select
            aria-label="Filter transactions by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            {[...new Set(transactions.map((transaction) => transaction.status))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Label>
      </div>
      <div className="admin-transaction-table-wrap">
        <table className="admin-transaction-table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Buyer</th>
              <th>Seller</th>
              <th>Item</th>
              <th>Status</th>
              <th>Created</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.id.slice(0, 8)}…</td>
                <td>{userNames.get(transaction.buyer_id) ?? "Unknown"}</td>
                <td>{userNames.get(transaction.seller_id) ?? "Unknown"}</td>
                <td>
                  {listingNames.get(transaction.listing_id) ??
                    transaction.listing_title_snapshot ??
                    "Listing unavailable"}
                </td>
                <td>{transaction.status}</td>
                <td>{shortDate(transaction.created_at)}</td>
                <td>{shortDate(transaction.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleTransactions.length ? (
          <p className="admin-empty-card">No transactions match these filters.</p>
        ) : null}
      </div>
    </section>
  );
}

function ReportsCenter({
  reports,
  onAction,
  reviewReport,
}: {
  reports: AdminReport[];
  onAction: (action: () => Promise<unknown>) => Promise<void>;
  reviewReport: ReviewReport;
}) {
  const [status, setStatus] = useState("open");
  const visibleReports = reports.filter((report) => status === "all" || report.status === status);
  return (
    <section className="admin-table-section" aria-labelledby="reports-center-heading">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">Legacy admin tab</p>
          <h2 id="reports-center-heading">Reports & violations center</h2>
          <p>Review unresolved cases, record decisions, and reopen reports when needed.</p>
        </div>
      </div>
      <div className="admin-filter-row">
        <Label>
          Status
          <select
            aria-label="Filter reports by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="open">Open</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All reports</option>
          </select>
        </Label>
      </div>
      <div className="admin-record-list">
        {visibleReports.length ? (
          visibleReports.map((report) => (
            <Card key={report.id} className="admin-record-card">
              <div>
                <strong>{report.reason}</strong>
                <span>{report.details || "No details provided"}</span>
                <small>
                  {report.status} · {shortDate(report.created_at)}
                </small>
              </div>
              <div className="admin-record-actions">
                {report.status === "open" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void onAction(() => reviewReport({ id: report.id, status: "reviewed" }))
                      }
                    >
                      Mark reviewed
                    </Button>
                    <ConfirmAction
                      description="Dismiss this report? It will be closed without action."
                      confirmLabel="Dismiss report"
                      onConfirm={() =>
                        onAction(() => reviewReport({ id: report.id, status: "dismissed" }))
                      }
                    >
                      <Button type="button" variant="outline">
                        Dismiss
                      </Button>
                    </ConfirmAction>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void onAction(() => reviewReport({ id: report.id, status: "open" }))
                    }
                  >
                    Reopen
                  </Button>
                )}
              </div>
            </Card>
          ))
        ) : (
          <Card className="admin-empty-card">No reports in this view.</Card>
        )}
      </div>
    </section>
  );
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(value));
}
