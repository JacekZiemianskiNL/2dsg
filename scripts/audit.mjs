// `npm run audit`: see lib/audit-gate.mjs.
import { main } from "./lib/audit-gate.mjs";

process.exitCode = main();
