import type { ApiResult } from "@devmentor/ui/backend/api";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Component, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SystemStatusCard } from "./system-status-card";

const { apiCall } = vi.hoisted(() => ({ apiCall: vi.fn() }));
vi.mock("@devmentor/ui/backend/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@devmentor/ui/backend/api")>()),
  apiCall,
}));

const OK: ApiResult<unknown> = { ok: true, status: 200, data: { status: "ok", db: "ok" } };
const DOWN: ApiResult<unknown> = { ok: false, status: 503, error: { code: "service_unavailable", message: "Database unavailable" } };
const NETWORK: ApiResult<unknown> = { ok: false, status: 0, error: { code: "network_error", message: "Network error. Check your connection and try again." } };

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <p role="alert">boundary: {this.state.error.message}</p> : this.props.children;
  }
}

beforeEach(() => {
  apiCall.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("SystemStatusCard", () => {
  it("shows a loading state, then Operational when the health check passes", async () => {
    apiCall.mockResolvedValue(OK);
    render(<SystemStatusCard />);
    expect(screen.getByRole("status")).toHaveTextContent("Checking…");
    expect(await screen.findByText("Operational")).not.toHaveClass("text-destructive");
    expect(apiCall).toHaveBeenCalledWith("/api/health", { signal: expect.any(AbortSignal) });
    expect(screen.getByRole("link", { name: "View public site" })).toHaveAttribute("href", "/");
  });

  it("shows Unavailable when the health endpoint reports the database down", async () => {
    apiCall.mockResolvedValue(DOWN);
    render(<SystemStatusCard />);
    expect(await screen.findByText("Unavailable")).toHaveClass("text-destructive");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error with retry when the status can't be loaded, and retries", async () => {
    apiCall.mockResolvedValueOnce(NETWORK).mockResolvedValueOnce(OK);
    render(<SystemStatusCard />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Network error");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Operational")).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledTimes(2);
    expect(apiCall).toHaveBeenLastCalledWith("/api/health", { signal: undefined });
  });

  it("aborts the request on unmount and ignores the resulting rejection", async () => {
    let rejectRequest: (error: unknown) => void = () => {};
    apiCall.mockImplementation(({}, { signal }: { signal: AbortSignal }) => {
      signal.addEventListener("abort", () => rejectRequest(new DOMException("aborted", "AbortError")));
      return new Promise((_resolve, reject) => (rejectRequest = reject));
    });
    const { unmount } = render(<SystemStatusCard />);
    const [, { signal }] = apiCall.mock.calls[0] as [string, { signal: AbortSignal }];
    unmount();
    expect(signal.aborted).toBe(true);
    await Promise.resolve();
  });

  const misuse = () => Promise.reject(new Error("apiCall misuse"));
  it.each([
    ["the initial load", [misuse]],
    ["a retry", [async () => NETWORK, misuse]],
  ])("passes an unexpected rejection during %s to the error boundary", async (_, responses) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const response of responses) apiCall.mockImplementationOnce(response);
    render(
      <Boundary>
        <SystemStatusCard />
      </Boundary>,
    );
    if (responses.length > 1) await userEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText("boundary: apiCall misuse")).toBeInTheDocument();
  });
});
