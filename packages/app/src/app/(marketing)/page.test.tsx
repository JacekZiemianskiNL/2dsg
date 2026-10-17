import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "./page";

describe("HomePage", () => {
  it("shows the DevMentor placeholder", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "DevMentor" })).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getByText(/Guided mentorship for developers/)).toBeInTheDocument();
  });
});
