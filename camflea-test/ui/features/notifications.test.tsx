import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationToolbar } from "@/components/camflea-app";

describe("notification toolbar", () => {
  it("offers mark-all-read only when unread notifications exist", () => {
    const markAll = vi.fn();
    const { rerender } = render(
      <NotificationToolbar unreadCount={2} onMarkAllRead={markAll} />,
    );

    expect(screen.getByText("2 unread")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /mark all as read/i }));
    expect(markAll).toHaveBeenCalledOnce();

    rerender(<NotificationToolbar unreadCount={0} onMarkAllRead={markAll} />);
    expect(screen.queryByRole("button", { name: /mark all as read/i })).not.toBeInTheDocument();
  });
});
