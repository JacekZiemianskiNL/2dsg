import { connection } from "next/server";

import { withScope } from "@/server/scope";

// Public endpoint: report only ok/error, never error details, versions or hostnames.
export async function GET(): Promise<Response> {
  await connection();
  try {
    await withScope(({ em }) => em.execute("select 1"));
    return Response.json({ status: "ok", db: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Health check failed:", error);
    return Response.json({ status: "error", db: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
