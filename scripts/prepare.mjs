import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const isCi = process.env.CI === "1" || process.env.CI === "true";
const isGitDependencyInstall = process.env.INIT_CWD !== process.cwd();
const shouldSetupHusky = !isCi && existsSync(".git");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (isGitDependencyInstall) {
  run("npm", ["run", "build"]);
} else if (shouldSetupHusky) {
  run("husky", []);
}
