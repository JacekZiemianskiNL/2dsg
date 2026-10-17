// Validation-gate wrapper around `npm audit`: fails on high/critical advisories unless allowlisted
// in audit-allowlist.json (with a reason and review date). Expired or stale entries also fail.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BLOCKING_SEVERITIES = new Set(["high", "critical"]);
const GHSA_ID = /GHSA(-[a-z0-9]{4}){3}/i;

/** @typedef {{ id: string, package: string, reason: string, reviewBy: string }} AllowlistEntry */

/** @returns {Map<string, { severity: string, title: string, packages: Set<string> }>} */
function readAdvisories() {
  const result = spawnSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(`npm audit did not return JSON (exit ${result.status}):\n${result.stderr}`);
  }
  if (report.error) throw new Error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`);

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

/** @returns {AllowlistEntry[]} */
function readAllowlist() {
  return JSON.parse(readFileSync(new URL("../audit-allowlist.json", import.meta.url), "utf8")).advisories;
}

const today = new Date().toISOString().slice(0, 10);
const advisories = readAdvisories();
const allowlist = readAllowlist();
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
if (problems.length > 0) {
  console.error(`npm audit gate failed:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`npm audit gate passed (${advisories.size} advisories reported; accepted via allowlist: ${accepted.join(", ") || "none"}).`);
