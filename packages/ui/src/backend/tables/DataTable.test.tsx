import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableColumn } from "./DataTable";

interface Session {
  id: string;
  mentor: string;
  minutes: number;
}
const rows: Session[] = [
  { id: "s1", mentor: "Ada", minutes: 60 },
  { id: "s2", mentor: "Linus", minutes: 30 },
];
const columns: Array<DataTableColumn<Session>> = [
  { key: "mentor", header: "Mentor" },
  { key: "minutes", header: "Length", cell: (row) => `${row.minutes} min` },
];
const base = { columns, getRowId: (row: Session) => row.id, label: "Sessions" };

describe("DataTable", () => {
  it("shows the loading state", () => {
    render(<DataTable {...base} rows={undefined} isLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the error state with retry", async () => {
    const onRetry = vi.fn();
    render(<DataTable {...base} rows={undefined} error="Could not load sessions" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load sessions");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the empty state", () => {
    render(<DataTable {...base} rows={[]} emptyTitle="No sessions yet" />);
    expect(screen.getByText("No sessions yet")).toBeInTheDocument();
  });

  it("renders headers and cells, using the default or custom cell renderer", () => {
    render(<DataTable {...base} rows={rows} />);
    const table = screen.getByRole("table", { name: "Sessions" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Mentor", "Length"]);
    const [, first] = within(table).getAllByRole("row");
    expect(within(first!).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Ada", "60 min"]);
  });

  it("renders row actions per row", async () => {
    const cancel = vi.fn();
    render(<DataTable {...base} rows={rows} rowActions={(row) => [{ label: "Cancel", onSelect: () => cancel(row.id), isDestructive: true }]} />);
    const [, , second] = screen.getAllByRole("row");
    await userEvent.click(within(second!).getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalledWith("s2");
  });

  it("paginates and disables out-of-range buttons", async () => {
    const onPageChange = vi.fn();
    const { rerender } = render(<DataTable {...base} rows={rows} pagination={{ page: 1, pageSize: 2, total: 5, onPageChange }} />);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toHaveTextContent("Page 1 of 3 · 5 total");
    expect(within(nav).getByRole("button", { name: "Previous" })).toBeDisabled();
    await userEvent.click(within(nav).getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(<DataTable {...base} rows={rows} pagination={{ page: 3, pageSize: 2, total: 5, onPageChange }} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
