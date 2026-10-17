// Runs a command with the root .env loaded: see lib/with-env.mjs.
import { main } from "./lib/with-env.mjs";

process.exitCode = await main();
