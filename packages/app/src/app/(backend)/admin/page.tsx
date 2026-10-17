import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@devmentor/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@devmentor/ui/components/card";

import { ServiceUnavailableError, withScope } from "@devmentor/core";

export default async function AdminPage() {
  await connection();
  const dbHealthy = await withScope(({ healthService }) => healthService.check()).then(
    () => true,
    (error: unknown) => {
      if (error instanceof ServiceUnavailableError) return false;
      throw error;
    },
  );

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>System status</CardTitle>
          <CardDescription>Live check of the application&apos;s dependencies.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="flex items-center justify-between text-sm">
            <dt>Database</dt>
            <dd className={dbHealthy ? "font-medium" : "font-medium text-destructive"}>
              {dbHealthy ? "Operational" : "Unavailable"}
            </dd>
          </dl>
        </CardContent>
        <CardFooter>
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            View public site
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
