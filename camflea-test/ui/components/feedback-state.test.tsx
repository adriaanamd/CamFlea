import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeedbackState } from "@/components/feedback-state";

describe("FeedbackState", () => {
  it.each([
    ["loading", "Loading"],
    ["empty", "Nothing here yet"],
    ["error", "Something went wrong"],
    ["restricted", "You do not have access"],
    ["unavailable", "This listing is unavailable"],
    ["success", "Saved"],
  ] as const)("renders a distinct %s state", (kind, title) => {
    render(<FeedbackState kind={kind} title={title} />);
    expect(screen.getByRole("status")).toHaveTextContent(title);
  });
});
