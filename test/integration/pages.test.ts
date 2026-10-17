import { describe, expect, inject, it } from "vitest";

import { createBrowser } from "./browser";

const appUrl = inject("appUrl");
const browser = createBrowser(inject("browserSession"));

describe("pages in a real browser", () => {
  it("shows the public landing page", async () => {
    await browser.open(`${appUrl}/`);
    expect(await browser.title()).toBe("DevMentor");
    expect(await browser.headingText("DevMentor")).toBe("DevMentor");
    // Rendered text (the "Coming soon" badge is CSS-uppercased, so it reads "COMING SOON" in the browser).
    await browser.waitForText("Guided mentorship for developers");
    await browser.waitForText("COMING SOON");
  });

  it("shows the admin dashboard with a live database status", async () => {
    await browser.open(`${appUrl}/admin`);
    expect(await browser.title()).toBe("Admin | DevMentor");
    expect(await browser.headingText("Dashboard")).toBe("Dashboard");
    await browser.waitForText("Operational");
  });

  it("navigates from the dashboard back to the public site", async () => {
    await browser.open(`${appUrl}/admin`);
    await browser.waitForText("View public site");
    await browser.clickLink("View public site");
    await browser.waitForUrl(`${appUrl}/`);
    expect(await browser.url()).toBe(`${appUrl}/`);
    expect(await browser.title()).toBe("DevMentor");
  });
});
