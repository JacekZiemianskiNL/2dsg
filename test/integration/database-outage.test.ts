import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { startApp, type AppServer } from "./app-server";
import { createBrowser } from "./browser";

// Port 1 refuses connections immediately: a database that is down, without stopping the shared one.
const UNREACHABLE_DATABASE_URL = "postgresql://nobody:nothing@127.0.0.1:1/none";

describe("when the database is down", () => {
  let app: AppServer;
  const browser = createBrowser(inject("browserSession"));

  beforeAll(async () => {
    app = await startApp({ databaseUrl: UNREACHABLE_DATABASE_URL });
  });
  afterAll(async () => {
    await app?.stop();
  });

  it("the health endpoint returns 503 without internal details", async () => {
    const response = await fetch(`${app.url}/api/health`);
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ ok: false, error: { code: "service_unavailable", message: "Database unavailable" } });
    expect(text).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|nobody/);
  });

  it("public pages still render and the dashboard reports Unavailable", async () => {
    await browser.open(`${app.url}/`);
    expect(await browser.title()).toBe("DevMentor");
    await browser.open(`${app.url}/admin`);
    await browser.waitForText("Unavailable");
  });
});
