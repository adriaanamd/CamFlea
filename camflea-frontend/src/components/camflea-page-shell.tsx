import { useEffect, useState, type ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export type ShellData = {
  user: { firstName: string; profileImage?: string | null } | null;
  unreadCount: number;
  isStaff: boolean;
};

export async function loadShellData(): Promise<ShellData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, unreadCount: 0, isStaff: false };

  const [profileResult, notificationsResult, rolesResult] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("first_name,profile_image")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("marketplace_notifications").select("id").eq("is_read", false),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const metadata = user.user_metadata as { first_name?: string } | undefined;
  const firstName = profileResult.data?.first_name || metadata?.first_name || "Student";
  const isStaff = (rolesResult.data ?? []).some(
    (role) => role.role === "admin" || role.role === "moderator",
  );

  return {
    user: {
      firstName,
      ...(profileResult.data?.profile_image !== undefined
        ? { profileImage: profileResult.data.profile_image }
        : {}),
    },
    unreadCount: notificationsResult.data?.length ?? 0,
    isStaff,
  };
}

export function CamFleaPageShell({
  children,
  load = loadShellData,
}: {
  children: ReactNode;
  load?: () => Promise<ShellData>;
}) {
  const [state, setState] = useState<ShellData | null>(null);

  useEffect(() => {
    let active = true;
    void load()
      .catch(() => ({ user: null, unreadCount: 0, isStaff: false }))
      .then((data) => {
        if (active) setState(data);
      });
    return () => {
      active = false;
    };
  }, [load]);

  if (!state) {
    return (
      <div className="camflea-loading" role="status">
        Loading CamFlea…
      </div>
    );
  }

  return (
    <AppShell user={state.user} unreadCount={state.unreadCount} isStaff={state.isStaff}>
      {children}
    </AppShell>
  );
}
