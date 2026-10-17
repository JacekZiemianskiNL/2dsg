import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const AGENT_BROWSER_BIN = fileURLToPath(new URL("../../node_modules/.bin/agent-browser", import.meta.url));
const COMMAND_TIMEOUT_MS = 30_000;
const WAIT_TIMEOUT_MS = 15_000;

interface AgentBrowserResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * A typed wrapper around the agent-browser CLI (headless Chrome), bound to one session.
 * Every command runs with `--json`; a failed command rejects with agent-browser's error message.
 */
export function createBrowser(session: string) {
  async function run<T>(...args: string[]): Promise<T> {
    let stdout: string;
    try {
      ({ stdout } = await execFileAsync(AGENT_BROWSER_BIN, ["--session", session, "--json", ...args], { timeout: COMMAND_TIMEOUT_MS }));
    } catch (error) {
      // agent-browser exits non-zero on failure but still prints the JSON response.
      stdout = (error as { stdout?: string }).stdout ?? "";
      if (!stdout) throw error;
    }
    const response = JSON.parse(stdout) as AgentBrowserResponse<T>;
    if (!response.success || response.data === null) {
      throw new Error(`agent-browser ${args.join(" ")} failed: ${response.error ?? "no data"}`);
    }
    return response.data;
  }

  return {
    open: (url: string) => run<{ title: string; url: string }>("open", url),
    waitForText: (text: string) => run("wait", "--text", text, "--timeout", String(WAIT_TIMEOUT_MS)),
    waitForUrl: (pattern: string) => run("wait", "--url", pattern, "--timeout", String(WAIT_TIMEOUT_MS)),
    title: async () => (await run<{ title: string }>("get", "title")).title,
    url: async () => (await run<{ url: string }>("get", "url")).url,
    headingText: async (name: string) => (await run<{ text: string }>("find", "role", "heading", "text", "--name", name, "--exact")).text,
    clickLink: (name: string) => run("find", "role", "link", "click", "--name", name, "--exact"),
    close: () => run("close"),
  };
}

export type Browser = ReturnType<typeof createBrowser>;
