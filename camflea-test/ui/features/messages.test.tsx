import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { MessageThread } from "@/features/messages/message-thread";
import { refreshOnMessageEvent } from "@/features/messages/realtime";

describe("message thread", () => {
  it("renders message bodies as text and offers a retry after send failure", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(undefined);
    render(
      createElement(MessageThread, {
        participantName: "Seller",
        listingTitle: "Textbook",
        messages: [],
        onSend: send,
      }),
    );
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "<img src=x onerror=alert(1)>" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("couldn't be sent"),
    );
    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Retry"));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("returns from the thread pane to the conversation list on mobile", () => {
    const back = vi.fn();
    render(
      createElement(MessageThread, {
        participantName: "Seller",
        messages: [],
        onSend: vi.fn(),
        onBack: back,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Back to conversations" }),
    );
    expect(back).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("navigation", { name: "Conversations" }),
    ).not.toBeInTheDocument();
  });

  it("uses a Realtime event only to reload authorized messages", () => {
    const reload = vi.fn();
    refreshOnMessageEvent(reload)({ new: { body: "private payload" } });
    expect(reload).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalledWith({ body: "private payload" });
  });
});
