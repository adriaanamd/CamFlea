import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { AccountStatusProvider } from "@/components/account-status-context";
import { BannedAccountModal } from "@/components/banned-account-modal";
import { supabase } from "@/integrations/supabase/client";
import {
  effectiveAccountStatus,
  type AccountStatusSnapshot,
  type AccountStatus,
} from "@/lib/domain/account-status";

export type ShellData = {
  user: { firstName: string; profileImage?: string | null } | null;
  unreadCount: number;
  isStaff: boolean;
  isAdmin: boolean;
  accountStatus: AccountStatusSnapshot;
  roleCheckFailed?: boolean;
};

export async function loadShellData(): Promise<ShellData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      unreadCount: 0,
      isStaff: false,
      isAdmin: false,
      accountStatus: {
        status: "active",
        reason: null,
        restrictionExpiresAt: null,
        warningCount: 0,
      },
    };
  }

  const [profileResult, notificationsResult, adminRoleResult, moderatorRoleResult, accountStatusResult] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("first_name,profile_image")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("marketplace_notifications").select("id").eq("is_read", false),
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: user.id, _role: "moderator" }),
    supabase.rpc("marketplace_get_my_account_status"),
  ]);
  const account = accountStatusResult.data?.[0];
  // Role checks must remain available if the optional moderation status RPC is temporarily unavailable.
  // Marketplace mutations still enforce account status in Supabase.
  const status = (account?.status ?? "active") as AccountStatus;
  const accountStatus: AccountStatusSnapshot = {
    status: effectiveAccountStatus(status, account?.restriction_expires_at),
    reason: account?.reason ?? null,
    restrictionExpiresAt: account?.restriction_expires_at ?? null,
    warningCount: account?.warning_count ?? 0,
  };

  const metadata = user.user_metadata as { first_name?: string } | undefined;
  const firstName = profileResult.data?.first_name || metadata?.first_name || "Student";
  const isAdmin = adminRoleResult.data === true;
  const isStaff = isAdmin || moderatorRoleResult.data === true;

  return {
    user: {
      firstName,
      ...(profileResult.data?.profile_image !== undefined
        ? { profileImage: profileResult.data.profile_image }
        : {}),
    },
    unreadCount: notificationsResult.data?.length ?? 0,
    isStaff,
    isAdmin,
    accountStatus,
    roleCheckFailed: Boolean(adminRoleResult.error || moderatorRoleResult.error),
  };
}

export function CamFleaPageShell({
  children,
  load = loadShellData,
  mode = "marketplace",
}: {
  children: ReactNode;
  load?: () => Promise<ShellData>;
  mode?: "marketplace" | "admin";
}) {
  const navigate = useNavigate();
  const [state, setState] = useState<ShellData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadFailed(false);
    void load()
      .catch(() => {
        if (active) setLoadFailed(true);
        return {
          user: null,
          unreadCount: 0,
          isStaff: false,
          isAdmin: false,
          accountStatus: {
            status: "active",
            reason: null,
            restrictionExpiresAt: null,
            warningCount: 0,
          },
        };
      })
      .then((data) => {
        if (active) setState(data);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const signedOut = state !== null && state.user === null && !loadFailed;
  const roleCheckFailed = state?.roleCheckFailed === true;
  const adminOnMarketplaceRoute = !roleCheckFailed && state?.isAdmin === true && mode === "marketplace";
  const studentOnAdminRoute =
    !roleCheckFailed && state !== null && state.user !== null && mode === "admin" && !state.isStaff;
  useEffect(() => {
    if (signedOut) void navigate({ to: "/auth", replace: true });
    else if (adminOnMarketplaceRoute) void navigate({ to: "/admin", replace: true });
    else if (studentOnAdminRoute) void navigate({ to: "/browse", replace: true });
  }, [adminOnMarketplaceRoute, navigate, signedOut, studentOnAdminRoute]);

  // Everything behind the shell requires a signed-in student; never render it for guests.
  if (!state || signedOut || roleCheckFailed || adminOnMarketplaceRoute || studentOnAdminRoute) {
    return (
      <div className="camflea-loading" role={roleCheckFailed ? "alert" : "status"}>
        Loading CamFlea…
      </div>
    );
  }

  async function signOutBannedUser() {
    const { error } = await supabase.auth.signOut();
    if (!error) await navigate({ to: "/auth", replace: true });
  }

  return (
    <AccountStatusProvider value={state.accountStatus}>
      <AppShell
        user={state.user}
        unreadCount={state.unreadCount}
        isStaff={state.isStaff}
        isAdmin={state.isAdmin}
        accountStatus={state.accountStatus}
      >
        {children}
      </AppShell>
      {state.accountStatus.status === "banned" ? (
        <BannedAccountModal onSignOut={signOutBannedUser} />
      ) : null}
    </AccountStatusProvider>
  );
}
