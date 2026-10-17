"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { buttonVariants } from "@devmentor/ui/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@devmentor/ui/components/ui/card";
import { apiCall, type ApiResult } from "@devmentor/ui/backend/api";
import { ErrorMessage, LoadingMessage } from "@devmentor/ui/backend/feedback";

interface HealthStatus {
  status: "ok";
  db: "ok";
}

type DatabaseState = "operational" | "unavailable";

function toDatabaseState(result: ApiResult<HealthStatus>): DatabaseState | null {
  if (result.ok) return "operational";
  // 503 is the health endpoint's way of saying "the database is down", not a failure to load.
  return result.error.code === "service_unavailable" ? "unavailable" : null;
}

export function SystemStatusCard() {
  const [result, setResult] = useState<ApiResult<HealthStatus> | null>(null);

  const fetchStatus = useCallback((signal?: AbortSignal) => apiCall<HealthStatus>("/api/health", { signal }), []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStatus(controller.signal).then(setResult, (error: unknown) => {
      // apiCall only rejects on abort (unmount) or misuse; surface misuse.
      if (!controller.signal.aborted) throw error;
    });
    return () => controller.abort();
  }, [fetchStatus]);

  const retry = () => {
    setResult(null);
    void fetchStatus().then(setResult);
  };

  const databaseState = result && toDatabaseState(result);

  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>Live check of the application&apos;s dependencies.</CardDescription>
      </CardHeader>
      <CardContent>
        {!result && <LoadingMessage label="Checking…" className="py-0" />}
        {result && !databaseState && !result.ok && <ErrorMessage message={result.error.message} onRetry={retry} />}
        {databaseState && (
          <dl className="flex items-center justify-between text-sm">
            <dt>Database</dt>
            <dd className={databaseState === "operational" ? "font-medium" : "font-medium text-destructive"}>
              {databaseState === "operational" ? "Operational" : "Unavailable"}
            </dd>
          </dl>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
          View public site
        </Link>
      </CardFooter>
    </Card>
  );
}
