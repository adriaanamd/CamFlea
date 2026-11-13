import { QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterContextProvider } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/components/app-shell";
import { routeTree } from "@/routeTree.gen";

function renderShell(isStaff: boolean) {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  return render(
    <RouterContextProvider router={router}>
      <AppShell user={{ firstName: "Ari" }} unreadCount={2} isStaff={isStaff}>
        <main>Content</main>
      </AppShell>
    </RouterContextProvider>,
  );
}

describe("AppShell", () => {
  it("keeps the marketplace destinations visibly labeled", () => {
    renderShell(true);

    expect(screen.getByRole("complementary", { name: "Marketplace navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Post item" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transactions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Messages" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Notifications/ })).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });

  it("does not expose staff navigation to a student", () => {
    renderShell(false);

    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });
});
