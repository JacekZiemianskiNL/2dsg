import { Loader2Icon } from "lucide-react";

import { cn } from "../../lib/utils";

export function LoadingMessage({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center gap-2 py-6 text-sm text-muted-foreground", className)}>
      <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
