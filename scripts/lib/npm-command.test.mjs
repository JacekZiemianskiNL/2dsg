import { describe, expect, it } from "vitest";

import { resolveCommand } from "./npm-command.mjs";

describe("resolveCommand", () => {
  it("runs npm through the current Node and npm's JS entry point when npm started the script", () => {
    expect(resolveCommand("npm", ["run", "dev"], { npm_execpath: "/npm/bin/npm-cli.js" })).toEqual([process.execPath, ["/npm/bin/npm-cli.js", "run", "dev"]]);
  });

  it("leaves npm alone outside an npm script, and other commands always", () => {
    expect(resolveCommand("npm", ["test"], {})).toEqual(["npm", ["test"]]);
    expect(resolveCommand("next", ["dev"], { npm_execpath: "/npm/bin/npm-cli.js" })).toEqual(["next", ["dev"]]);
  });
});
