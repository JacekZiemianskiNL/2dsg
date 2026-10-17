import { connection } from "next/server";
import { withScope } from "@devmentor/core";

// Public endpoint: report only ok/error, never error details, versions or hostnames.
export async function GET(): Promise<Response> {
  await connection();
  const headers = { "Cache-Control": "no-store" };
  const isAvailable = await withScope(({ healthService }) => healthService.isDatabaseAvailable());
  if (isAvailable) {
    return Response.json({ status: "ok", db: "ok" }, { headers });
  }
  return Response.json({ status: "error", db: "error" }, { status: 503, headers });
}
