import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const updateOwnProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => input)
  .handler(async ({ data, context }) => {
    const { profileUpdateForOwner } = await import("@/server/profile.server");
    const { error } = await context.supabase
      .from("student_profiles")
      .update(profileUpdateForOwner(data))
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not update your profile.");
    return { success: true };
  });
