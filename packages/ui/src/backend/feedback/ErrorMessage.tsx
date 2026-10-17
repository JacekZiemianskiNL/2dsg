import { CircleAlertIcon } from "lucide-react";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ title = "Something went wrong", message, onRetry, className }: ErrorMessageProps) {
  return (
    <div role="alert" className={cn("flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm", className)}>
      <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="grid gap-1">
        <p className="font-medium text-destructive">{title}</p>
        <p className="text-muted-foreground">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
