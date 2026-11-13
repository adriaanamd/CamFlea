import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const eslintEntry = resolve(
  repositoryRoot,
  "camflea-frontend",
  "node_modules",
  "eslint",
  "bin",
  "eslint.js",
);

const result = spawnSync(
  process.execPath,
  [eslintEntry, "--config", "eslint.config.js", "camflea-frontend/src", "camflea-test"],
  { cwd: repositoryRoot, stdio: "inherit" },
);

process.exit(result.status ?? 1);
