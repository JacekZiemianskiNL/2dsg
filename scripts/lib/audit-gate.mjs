// Validation-gate logic around `npm audit`: fails on high/critical advisories unless allowlisted
// in audit-allowlist.json (with a reason and review date). Expired or stale entries also fail.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BLOCKING_SEVERITIES = new Set(["high", "critical"]);
const GHSA_ID = /GHSA(-[a-z0-9]{4}){3}/i;
const ALLOWLIST_URL = new URL("../../audit-allowlist.json", import.meta.url);

/** @typedef {{ id: string, package: string, reason: string, reviewBy: string }} AllowlistEntry */
/** @typedef {{ severity: string, title: string, packages: Set<string> }} Advisory */
/** @typedef {{ name: string, via: Array<string | { source?: number, url?: string, severity: string, title: string }> }} Vulnerability */
/** @typedef {{ error?: { summary?: string }, vulnerabilities?: Record<string, Vulnerability> }} AuditReport */

/**
 * Groups the advisories in an `npm audit --json` report by GHSA id.
 * @param {AuditReport} report
 * @returns {Map<string, Advisory>}
 */
export function collectAdvisories(report) {
  if (report.error) throw new Error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);
  /** @type {Map<string, Advisory>} */
  const advisories = new Map();
  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via) {
      if (typeof via === "string") continue; // a transitive pointer; the advisory itself is listed on `via`
      const id = via.url?.match(GHSA_ID)?.[0] ?? String(via.source);
      const advisory = advisories.get(id) ?? { severity: via.severity, title: via.title, packages: new Set() };
      advisory.packages.add(vulnerability.name);
      advisories.set(id, advisory);
    }
  }
  return advisories;
}

/**
 * @param {{ advisories: Map<string, Advisory>, allowlist: AllowlistEntry[], today: string }} input
 * @returns {{ problems: string[], accepted: string[] }}
 */
export function evaluateAudit({ advisories, allowlist, today }) {
  const allowed = new Map(allowlist.map((entry) => [entry.id, entry]));
  const problems = [];
  for (const [id, advisory] of advisories) {
    if (!BLOCKING_SEVERITIES.has(advisory.severity)) continue;
    const entry = allowed.get(id);
    if (!entry) {
      problems.push(`${advisory.severity}: ${id} ${advisory.title} (${[...advisory.packages].join(", ")})`);
    } else if (entry.reviewBy < today) {
      problems.push(`allowlist entry ${id} expired on ${entry.reviewBy}; re-review it`);
    }
  }
  for (const entry of allowlist) {
    if (!advisories.has(entry.id)) problems.push(`allowlist entry ${entry.id} is no longer reported by npm audit; remove it`);
  }
  const accepted = allowlist.filter((entry) => advisories.has(entry.id)).map((entry) => entry.id);
  return { problems, accepted };
}

/** @returns {AuditReport} */
export function runNpmAudit() {
  const result = spawnSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`npm audit did not return JSON (exit ${result.status}):\n${result.stderr}`);
  }
}

/** @returns {AllowlistEntry[]} */
export function readAllowlist() {
  return JSON.parse(readFileSync(ALLOWLIST_URL, "utf8")).advisories;
}

/**
 * Runs the gate and returns the process exit code.
 * @param {{ runAudit?: () => AuditReport, loadAllowlist?: () => AllowlistEntry[], today?: string, log?: (message: string) => void, error?: (message: string) => void }} [deps]
 */
export function main(deps = {}) {
  const {
    runAudit = runNpmAudit,
    loadAllowlist = readAllowlist,
    today = new Date().toISOString().slice(0, 10),
    log = console.log,
    error = console.error,
  } = deps;
  const advisories = collectAdvisories(runAudit());
  const { problems, accepted } = evaluateAudit({ advisories, allowlist: loadAllowlist(), today });
  if (problems.length > 0) {
    error(`npm audit gate failed:\n- ${problems.join("\n- ")}`);
    return 1;
  }
  log(`npm audit gate passed (${advisories.size} advisories reported; accepted via allowlist: ${accepted.join(", ") || "none"}).`);
  return 0;
}
