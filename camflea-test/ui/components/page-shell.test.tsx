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
};

describe("CamFleaPageShell", () => {
  function renderPage(load: () => Promise<ShellData>, children: ReactNode) {
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    return render(
      <RouterContextProvider router={router}>
        <CamFleaPageShell load={load}>{children}</CamFleaPageShell>
      </RouterContextProvider>,
    );
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
});
