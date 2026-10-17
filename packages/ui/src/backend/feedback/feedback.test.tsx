import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "./EmptyState";
import { ErrorMessage } from "./ErrorMessage";
import { LoadingMessage } from "./LoadingMessage";

describe("feedback components", () => {
  it("LoadingMessage is a polite status with a default label", () => {
    render(<LoadingMessage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("ErrorMessage is an alert and offers a retry only when given one", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorMessage message="Could not load sessions" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load sessions");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(<ErrorMessage message="Could not load sessions" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("EmptyState renders title, description and action", () => {
    render(<EmptyState title="No reviews yet" description="Reviews appear after a session." action={<button>Book</button>} />);
    expect(screen.getByText("No reviews yet")).toBeInTheDocument();
    expect(screen.getByText("Reviews appear after a session.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book" })).toBeInTheDocument();
  });
});
