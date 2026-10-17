// Test helper only; not exported from the package entry point.
import type { DestinationStream } from "pino";

/** A pino destination that keeps parsed log lines in memory. */
export function captureLogs(): { destination: DestinationStream; lines: Array<Record<string, unknown>> } {
  const lines: Array<Record<string, unknown>> = [];
  return {
    lines,
    destination: {
      write(message: string) {
        lines.push(JSON.parse(message) as Record<string, unknown>);
      },
    },
  };
}
