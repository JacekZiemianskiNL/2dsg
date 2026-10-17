import { connection } from "next/server";
import { apiHandler, publicRoute, withScope } from "@devmentor/core";

// Public: 200 { ok: true, data: { status, db } }, or 503 service_unavailable with no internal details.
export const GET = apiHandler({ authorize: publicRoute }, async () => {
  await connection();
  return withScope(({ healthService }) => healthService.check());
});
