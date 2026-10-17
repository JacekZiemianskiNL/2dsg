import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdminPage from "./page";

vi.mock("./system-status-card", () => ({ SystemStatusCard: () => <section aria-label="status card" /> }));

describe("AdminPage", () => {
  it("shows the dashboard heading and the system status card", () => {
    render(<AdminPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "status card" })).toBeInTheDocument();
  });
});
