import { useEffect, useState } from "react";
import { AlertCircle, Check, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  loadAdminReports,
  reportQueuePageSize,
  reviewAdminReport,
} from "@/features/admin/report-actions.server";
import type { ReportQueueFilters } from "@/features/admin/report-actions.server";
import type { Tables } from "@/integrations/supabase/types";

export type ReportQueueRecord = Pick<
  Tables<"marketplace_reports">,
  "id" | "reason" | "details" | "status" | "created_at" | "listing_id" | "reported_user_id"
>;

type LoadReports = (filters: ReportQueueFilters) => Promise<ReportQueueRecord[]>;
type ReviewReport = (id: string) => Promise<{ id: string }>;

const defaultLoadReports: LoadReports = (filters) => loadAdminReports({ data: filters });
const defaultReviewReport: ReviewReport = (id) => reviewAdminReport({ data: { id } });

function reportTarget(report: ReportQueueRecord) {
  if (report.listing_id) return "Listing report";
  if (report.reported_user_id) return "User report";
  return "Community report";
}

export function AdminReportQueue({
  loadReports = defaultLoadReports,
  reviewReport = defaultReviewReport,
}: {
  loadReports?: LoadReports;
  reviewReport?: ReviewReport;
}) {
  const [status, setStatus] = useState<ReportQueueFilters["status"]>("open");
  const [page, setPage] = useState(0);
  const [reports, setReports] = useState<ReportQueueRecord[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void loadReports({ status, page })
      .then((rows) => {
        if (!active) return;
        setReports((current) => (page === 0 ? rows : [...current, ...rows]));
        setHasMore(rows.length === reportQueuePageSize);
      })
      .catch(() => {
        if (active)
          setError("Unable to load community reports. Your staff access may have changed.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadReports, page, refreshKey, status]);

  async function markReviewed(id: string) {
    setReviewingId(id);
    setError(null);
    setNotice(null);
    try {
      await reviewReport(id);
      setReports((current) =>
        status === "open"
          ? current.filter((report) => report.id !== id)
          : current.map((report) =>
              report.id === id ? { ...report, status: "reviewed" } : report,
            ),
      );
      setNotice("Report marked as reviewed.");
    } catch {
      setError("Could not mark this report as reviewed. It may have already changed.");
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex items-start gap-3 rounded-2xl bg-green-700 p-5 text-white shadow-sm sm:p-7">
        <ShieldCheck aria-hidden="true" className="mt-1 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-50">CamFlea safety desk</p>
          <h1 className="mt-1 text-2xl font-semibold">Community reports</h1>
          <p className="mt-2 max-w-2xl text-sm text-green-50">
            Review reports from students and record a decision for the community.
          </p>
        </div>
      </header>

      <section className="space-y-4" aria-labelledby="report-list-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="report-list-heading" className="text-xl font-semibold">
              Report queue
            </h2>
            <p className="text-sm text-muted-foreground">
              Only report details needed for review are shown.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="report-status">Filter by status</Label>
            <select
              id="report-status"
              value={status}
              onChange={(event) => {
                setReports([]);
                setHasMore(false);
                setPage(0);
                setStatus(event.target.value as ReportQueueFilters["status"]);
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="open">Open</option>
              <option value="reviewed">Reviewed</option>
              <option value="all">All reports</option>
            </select>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
          >
            <span className="flex items-center gap-2">
              <AlertCircle aria-hidden="true" className="size-4" />
              {error}
            </span>
            <Button type="button" variant="outline" onClick={() => setRefreshKey((key) => key + 1)}>
              Retry
            </Button>
          </div>
        ) : null}
        {notice ? (
          <p role="status" className="text-sm text-green-800">
            {notice}
          </p>
        ) : null}
        {loading && reports.length === 0 ? <p role="status">Loading community reports…</p> : null}

        {!loading && !error && reports.length === 0 ? (
          <Card className="rounded-2xl p-8 text-center text-muted-foreground">
            No reports in this view.
          </Card>
        ) : null}

        <div className="grid gap-3">
          {reports.map((report) => (
            <Card key={report.id} className="rounded-2xl p-4 sm:p-5">
              <article className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{report.reason}</h3>
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800">
                      {report.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{reportTarget(report)}</span>
                  </div>
                  {report.details ? (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {report.details}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No additional details provided.</p>
                  )}
                  <time
                    className="block text-xs text-muted-foreground"
                    dateTime={report.created_at}
                  >
                    {new Intl.DateTimeFormat("en-PH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(report.created_at))}
                  </time>
                </div>
                {report.status === "open" ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={reviewingId !== null}
                    onClick={() => void markReviewed(report.id)}
                  >
                    <Check aria-hidden="true" />
                    {reviewingId === report.id ? "Saving…" : "Mark reviewed"}
                  </Button>
                ) : null}
              </article>
            </Card>
          ))}
        </div>

        {hasMore ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setPage((current) => current + 1)}
            >
              {loading ? "Loading…" : "Load more reports"}
            </Button>
          </div>
        ) : null}
        {loading && reports.length > 0 ? (
          <p role="status" className="text-center text-sm text-muted-foreground">
            Loading more reports…
          </p>
        ) : null}
      </section>
    </main>
  );
}
