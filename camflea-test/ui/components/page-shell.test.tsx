import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterContextProvider } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CamFleaPageShell, type ShellData } from "@/components/camflea-page-shell";
import { routeTree } from "@/routeTree.gen";

const shellData: ShellData = {
  user: { firstName: "Mina", profileImage: null },
  unreadCount: 3,
  isStaff: true,
  isAdmin: false,
};

describe("CamFleaPageShell", () => {
  function renderPage(
    load: () => Promise<ShellData>,
    children: ReactNode,
    initialEntries = ["/"],
    mode: "marketplace" | "admin" = "marketplace",
  ) {
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries }),
    });
    render(
      <RouterContextProvider router={router}>
        <CamFleaPageShell load={load} mode={mode}>
          {children}
        </CamFleaPageShell>
      </RouterContextProvider>,
    );
    return router;
  }

  it("keeps feature pages inside the shared navigation chrome", async () => {
    const load = vi.fn<() => Promise<ShellData>>().mockResolvedValue(shellData);

    renderPage(load, <h1>Browse items</h1>);

    expect(screen.getByRole("status")).toHaveTextContent("Loading CamFlea");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Browse items" })).toBeVisible());
    expect(screen.getByRole("link", { name: /Mina/i })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: /3 unread notifications/i })).toHaveAttribute(
      "href",
      "/notifications",
    );
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
  });

  it("shows the page even when session hydration fails", async () => {
    const load = vi.fn<() => Promise<ShellData>>().mockRejectedValue(new Error("offline"));

    renderPage(load, <h1>Post an item</h1>);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Post an item" })).toBeVisible());
    expect(screen.getByText("Log in")).toBeVisible();
  });

  it("redirects an admin away from marketplace routes", async () => {
    const router = renderPage(
      vi.fn<() => Promise<ShellData>>().mockResolvedValue({ ...shellData, isAdmin: true }),
      <h1>Browse items</h1>,
      ["/browse"],
    );

    await waitFor(() => expect(router.state.location.pathname).toBe("/admin"));
  });

  it("redirects a student away from the admin route", async () => {
    const router = renderPage(
      vi.fn<() => Promise<ShellData>>().mockResolvedValue({ ...shellData, isStaff: false }),
      <h1>Admin dashboard</h1>,
      ["/admin"],
      "admin",
    );

    await waitFor(() => expect(router.state.location.pathname).toBe("/browse"));
  });

  it("does not redirect an admin while role verification is unavailable", async () => {
    const router = renderPage(
      vi.fn<() => Promise<ShellData>>().mockResolvedValue({
        ...shellData,
        isStaff: false,
        isAdmin: false,
        roleCheckFailed: true,
      }),
      <h1>Admin dashboard</h1>,
      ["/admin"],
      "admin",
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
    expect(router.state.location.pathname).toBe("/admin");
  });
});
