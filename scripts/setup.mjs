// `npm run setup`: see lib/setup.mjs.
import { main } from "./lib/setup.mjs";

process.exitCode = await main();
