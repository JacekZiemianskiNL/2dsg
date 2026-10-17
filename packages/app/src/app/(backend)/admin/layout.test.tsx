import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminLayout, { metadata } from "./layout";

describe("AdminLayout", () => {
  it("wraps admin pages in a header with a link back to the dashboard", () => {
    render(
      <AdminLayout>
        <p>page body</p>
      </AdminLayout>,
    );
    expect(screen.getByRole("banner")).toHaveTextContent("DevMentorAdmin");
    expect(screen.getByRole("link", { name: "DevMentor" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("main")).toHaveTextContent("page body");
  });

  it("keeps admin pages out of search engines", () => {
    expect(metadata).toEqual({ title: "Admin", robots: { index: false, follow: false } });
  });
});
