import { afterEach, describe, expect, it, vi } from "vitest";

const { spawnSync } = vi.hoisted(() => ({ spawnSync: vi.fn() }));
vi.mock("node:child_process", () => ({ spawnSync }));

const { collectAdvisories, evaluateAudit, main, readAllowlist, runNpmAudit } = await import("./audit-gate.mjs");

const BRACES = "GHSA-vfj7-8cjw-p6xm";
const advisory = (overrides = {}) => ({
  url: `https://github.com/advisories/${BRACES}`,
  severity: "high",
  title: "braces DoS",
  source: 1,
  ...overrides,
});

afterEach(() => {
  spawnSync.mockReset();
  vi.restoreAllMocks();
});

describe("collectAdvisories", () => {
  it("groups advisories by GHSA id across the packages that pull them in", () => {
    const advisories = collectAdvisories({
      vulnerabilities: {
        braces: { name: "braces", via: [advisory()] },
        micromatch: { name: "micromatch", via: ["braces", advisory()] },
      },
    });
    expect([...advisories.keys()]).toEqual([BRACES]);
    expect(advisories.get(BRACES)).toEqual({ severity: "high", title: "braces DoS", packages: new Set(["braces", "micromatch"]) });
  });

  it("falls back to the npm source id when there is no GHSA url", () => {
    const advisories = collectAdvisories({
      vulnerabilities: {
        a: { name: "a", via: [advisory({ url: undefined, source: 42 })] },
        b: { name: "b", via: [advisory({ url: "https://example.com/advisory", source: 7 })] },
      },
    });
    expect([...advisories.keys()]).toEqual(["42", "7"]);
  });

  it("handles a report without vulnerabilities", () => {
    expect(collectAdvisories({}).size).toBe(0);
  });

  it("throws when npm audit itself failed", () => {
    expect(() => collectAdvisories({ error: { summary: "ENOTFOUND registry.npmjs.org" } })).toThrow("npm audit failed: ENOTFOUND");
    expect(() => collectAdvisories({ error: {} })).toThrow("npm audit failed: {}");
  });
});

describe("evaluateAudit", () => {
  const advisories = (severity = "high") => new Map([[BRACES, { severity, title: "braces DoS", packages: new Set(["braces"]) }]]);
  const entry = (reviewBy = "2099-01-01") => ({ id: BRACES, package: "braces", reason: "no patch", reviewBy });

  it("accepts an allowlisted advisory before its review date", () => {
    expect(evaluateAudit({ advisories: advisories(), allowlist: [entry()], today: "2026-10-17" })).toEqual({ problems: [], accepted: [BRACES] });
  });

  it("fails on a blocking advisory that is not allowlisted", () => {
    const { problems } = evaluateAudit({ advisories: advisories("critical"), allowlist: [], today: "2026-10-17" });
    expect(problems).toEqual([`critical: ${BRACES} braces DoS (braces)`]);
  });

  it("ignores advisories below high severity", () => {
    expect(evaluateAudit({ advisories: advisories("moderate"), allowlist: [], today: "2026-10-17" }).problems).toEqual([]);
  });

  it("fails on an expired allowlist entry", () => {
    const { problems } = evaluateAudit({ advisories: advisories(), allowlist: [entry("2026-01-01")], today: "2026-10-17" });
    expect(problems).toEqual([`allowlist entry ${BRACES} expired on 2026-01-01; re-review it`]);
  });

  it("fails on a stale allowlist entry", () => {
    const { problems, accepted } = evaluateAudit({ advisories: new Map(), allowlist: [entry()], today: "2026-10-17" });
    expect(problems).toEqual([`allowlist entry ${BRACES} is no longer reported by npm audit; remove it`]);
    expect(accepted).toEqual([]);
  });
});

describe("runNpmAudit", () => {
  it("runs npm audit --json and parses its output", () => {
    spawnSync.mockReturnValue({ stdout: '{"vulnerabilities":{}}', stderr: "", status: 0 });
    expect(runNpmAudit()).toEqual({ vulnerabilities: {} });
    expect(spawnSync).toHaveBeenCalledWith("npm", ["audit", "--json"], expect.objectContaining({ encoding: "utf8" }));
  });

  it("throws with npm's stderr when the output isn't JSON", () => {
    spawnSync.mockReturnValue({ stdout: "", stderr: "npm ERR! network", status: 1 });
    expect(() => runNpmAudit()).toThrow(/did not return JSON \(exit 1\):\nnpm ERR! network/);
  });
});

describe("readAllowlist", () => {
  it("reads every entry with a reason and a review date", () => {
    const allowlist = readAllowlist();
    expect(allowlist.length).toBeGreaterThan(0);
    for (const entry of allowlist) {
      expect(entry).toEqual({ id: expect.stringMatching(/^GHSA-/), package: expect.any(String), reason: expect.any(String), reviewBy: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    }
  });
});

describe("main", () => {
  it("returns 0 and reports accepted advisories", () => {
    const log = vi.fn();
    const code = main({
      runAudit: () => ({ vulnerabilities: { braces: { name: "braces", via: [advisory()] } } }),
      loadAllowlist: () => [{ id: BRACES, package: "braces", reason: "r", reviewBy: "2099-01-01" }],
      today: "2026-10-17",
      log,
    });
    expect(code).toBe(0);
    expect(log).toHaveBeenCalledWith(`npm audit gate passed (1 advisories reported; accepted via allowlist: ${BRACES}).`);
  });

  it("returns 1 and lists the problems", () => {
    const error = vi.fn();
    const code = main({ runAudit: () => ({ vulnerabilities: { braces: { name: "braces", via: [advisory()] } } }), loadAllowlist: () => [], today: "2026-10-17", error });
    expect(code).toBe(1);
    expect(error).toHaveBeenCalledWith(`npm audit gate failed:\n- high: ${BRACES} braces DoS (braces)`);
  });

  it("defaults to the real npm audit, allowlist file, today's date and the console", () => {
    spawnSync.mockReturnValue({ stdout: "{}", stderr: "", status: 0 });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const allowlisted = readAllowlist().length;
    const code = main();
    expect(spawnSync).toHaveBeenCalledOnce();
    // No advisories reported, so every allowlist entry is stale.
    expect(code).toBe(allowlisted > 0 ? 1 : 0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("is no longer reported by npm audit"));
    expect(log).not.toHaveBeenCalled();
  });

  it("says none when nothing is accepted", () => {
    const log = vi.fn();
    expect(main({ runAudit: () => ({}), loadAllowlist: () => [], log })).toBe(0);
    expect(log).toHaveBeenCalledWith("npm audit gate passed (0 advisories reported; accepted via allowlist: none).");
  });
});
