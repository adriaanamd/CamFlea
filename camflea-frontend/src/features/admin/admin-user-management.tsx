import { useState } from "react";
import { Ban, CircleAlert } from "lucide-react";

import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminUser } from "@/features/admin/admin-dashboard-data";

type AdminUserAction = (action: () => Promise<unknown>) => Promise<void>;
type WarnUser = (input: { userId: string; reason?: string }) => Promise<{ warningCount: number }>;
type SetAccountStatus = (input: {
  userId: string;
  status: "active" | "restricted" | "banned";
  reason?: string;
  restrictionExpiresAt?: string | null;
}) => Promise<{ success: boolean }>;

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function AdminUserManagement({
  users,
  onAction,
  warnUser,
  setAccountStatus,
}: {
  users: AdminUser[];
  onAction: AdminUserAction;
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
            <AdminUserRecord
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

function AdminUserRecord({
  user,
  onAction,
  warnUser,
  setAccountStatus,
}: {
  user: AdminUser;
  onAction: AdminUserAction;
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
          {user.school || "School not provided"} · {user.program || "Program not provided"} · {" "}
          {user.status} · {user.warning_count} warnings
        </small>
      </div>
      <div className="admin-user-stats" aria-label={`${user.first_name} activity statistics`}>
        <span>{countLabel(user.listing_count, "listing")}</span>
        <span>{countLabel(user.available_listing_count, "available listing")}</span>
        <span>{countLabel(user.sold_listing_count, "sold listing")}</span>
        <span>{countLabel(user.transaction_count, "transaction record")}</span>
        <span>{countLabel(user.completed_purchase_count, "completed purchase")}</span>
        <span>{countLabel(user.message_count, "message sent", "messages sent")}</span>
        <span>{countLabel(user.report_count, "report received", "reports received")}</span>
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
