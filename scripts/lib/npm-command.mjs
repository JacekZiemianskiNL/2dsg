// Spawning `npm` directly fails on Windows, where it is `npm.cmd` and needs a shell. Under an npm script,
// npm_execpath points at npm's JS entry point, so running it with the current Node works on every platform.

/**
 * @param {string} command
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} env
 * @returns {[string, string[]]}
 */
export function resolveCommand(command, args, env) {
  if (command === "npm" && env.npm_execpath) return [process.execPath, [env.npm_execpath, ...args]];
  return [command, args];
}
