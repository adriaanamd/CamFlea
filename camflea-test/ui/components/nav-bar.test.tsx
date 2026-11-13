import { QueryClient } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterContextProvider } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";

import { NavBar } from "@/components/nav-bar";
import { supabase } from "@/integrations/supabase/client";
import { routeTree } from "@/routeTree.gen";

describe("NavBar", () => {
  it("is the shared marketplace chrome for every authenticated page", () => {
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: ["/transactions"] }),
    });

    render(
      <RouterContextProvider router={router}>
        <NavBar user={{ firstName: "Ari" }} unreadCount={2} isStaff />
      </RouterContextProvider>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Marketplace navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transactions" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });

  it("requires confirmation before logging out", async () => {
    const signOut = vi.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null });
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: ["/transactions"] }),
    });

    render(
      <RouterContextProvider router={router}>
        <NavBar user={{ firstName: "Ari" }} unreadCount={0} isStaff />
      </RouterContextProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure?");
    expect(signOut).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    signOut.mockRestore();
  });
});
