import { describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: supabaseMocks,
}));

import { loadShellData } from "@/components/camflea-page-shell";

describe("loadShellData", () => {
  function mockAdminShell(accountStatusError = false) {
    supabaseMocks.auth.getUser.mockResolvedValue({
      data: { user: { id: "admin-id", user_metadata: { first_name: "Admin" } } },
    });
    supabaseMocks.from.mockImplementation((table: string) => {
      const result = table === "student_profiles" ? { first_name: "Admin", profile_image: null } : [];
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: result, error: null }),
          }),
        }),
      };
    });
    supabaseMocks.rpc.mockImplementation((name: string, args?: Record<string, string>) => {
      if (name === "has_role") {
        return Promise.resolve({ data: args?._role === "admin", error: null });
      }
      if (accountStatusError) return Promise.resolve({ data: null, error: new Error("RPC unavailable") });
      return Promise.resolve({
        data: [{ status: "active", reason: null, restriction_expires_at: null, warning_count: 0 }],
        error: null,
      });
    });
  }

  it("uses authoritative role checks to show the admin shell", async () => {
    mockAdminShell();

    const shell = await loadShellData();

    expect(shell.isStaff).toBe(true);
    expect(shell.isAdmin).toBe(true);
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("has_role", {
      _user_id: "admin-id",
      _role: "admin",
    });
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("has_role", {
      _user_id: "admin-id",
      _role: "moderator",
    });
  });

  it("keeps verified admin access when account status is temporarily unavailable", async () => {
    mockAdminShell(true);

    const shell = await loadShellData();

    expect(shell.isAdmin).toBe(true);
    expect(shell.accountStatus.status).toBe("active");
  });
});
