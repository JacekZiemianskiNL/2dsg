import pg from "pg";
import { describe, expect, inject, it } from "vitest";

const appUrl = inject("appUrl");

describe("GET /api/health against a real database", () => {
  it("returns the success envelope and is never cached", async () => {
    const response = await fetch(`${appUrl}/api/health`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok", db: "ok" } });
  });

  it("only allows GET", async () => {
    const response = await fetch(`${appUrl}/api/health`, { method: "DELETE" });
    expect(response.status).toBe(405);
  });
});

describe("ephemeral database", () => {
  it("was migrated by the real migration CLI before the app started", async () => {
    const client = new pg.Client({ connectionString: inject("databaseUrl") });
    await client.connect();
    try {
      const { rows } = await client.query<{ exists: boolean }>("select to_regclass('public.mikro_orm_migrations') is not null as exists");
      expect(rows[0]?.exists).toBe(true);
    } finally {
      await client.end();
    }
  });
});
