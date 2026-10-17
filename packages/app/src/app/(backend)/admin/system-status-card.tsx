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

type CardView =
  | { kind: "loading" }
  | { kind: "status"; isOperational: boolean }
  | { kind: "error"; message: string };

function toView(result: ApiResult<HealthStatus> | null): CardView {
  if (!result) return { kind: "loading" };
  if (result.ok) return { kind: "status", isOperational: true };
  // 503 is the health endpoint's way of saying "the database is down", not a failure to load.
  if (result.error.code === "service_unavailable") return { kind: "status", isOperational: false };
  return { kind: "error", message: result.error.message };
}

export function SystemStatusCard() {
  const [result, setResult] = useState<ApiResult<HealthStatus> | null>(null);

  const load = useCallback((signal?: AbortSignal) => {
    apiCall<HealthStatus>("/api/health", { signal }).then(setResult, (error: unknown) => {
      if (signal?.aborted) return;
      // apiCall only rejects on misuse; hand the error to the nearest error boundary.
      setResult(() => {
        throw error;
      });
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const retry = () => {
    setResult(null);
    load();
  };

  const view = toView(result);

  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>Live check of the application&apos;s dependencies.</CardDescription>
      </CardHeader>
      <CardContent>
        {view.kind === "loading" && <LoadingMessage label="Checking…" className="py-0" />}
        {view.kind === "error" && <ErrorMessage message={view.message} onRetry={retry} />}
        {view.kind === "status" && (
          <dl className="flex items-center justify-between text-sm">
            <dt>Database</dt>
            <dd className={view.isOperational ? "font-medium" : "font-medium text-destructive"}>
              {view.isOperational ? "Operational" : "Unavailable"}
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
