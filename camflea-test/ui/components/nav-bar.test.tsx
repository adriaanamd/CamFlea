import { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterContextProvider } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { NavBar } from "@/components/nav-bar";
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
});
