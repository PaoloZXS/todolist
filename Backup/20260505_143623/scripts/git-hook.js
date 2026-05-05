#!/usr/bin/env node
import { readFile, writeFile } from "fs/promises";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const serviceWorkerPath = path.join(repoRoot, "service-worker.js");

function run(command) {
  execSync(command, {
    stdio: "inherit",
    shell: true,
    cwd: repoRoot
  });
}

async function bumpServiceWorkerCache() {
  const source = await readFile(serviceWorkerPath, "utf8");
  const regex = /const CACHE_NAME = "cose-da-fare-cache-v(\d+)";/;
  const match = source.match(regex);
  if (!match) {
    console.error(
      "[git-hook] Cannot find cache version string in service-worker.js"
    );
    process.exit(1);
  }

  const nextVersion = Number(match[1]) + 1;
  const updated = source.replace(
    regex,
    `const CACHE_NAME = "cose-da-fare-cache-v${nextVersion}";`
  );
  if (updated === source) {
    return null;
  }

  await writeFile(serviceWorkerPath, updated, "utf8");
  run(`git add "${serviceWorkerPath}"`);
  console.log(
    `[git-hook] Bumped service-worker cache to v${nextVersion} and staged the file.`
  );
  return nextVersion;
}

function pushAfterCommit() {
  try {
    run("git push");
    console.log("[git-hook] Auto push completed.");
  } catch (error) {
    console.error("[git-hook] Auto push failed.");
    process.exit(1);
  }
}

async function main() {
  const mode = process.argv[2];
  if (mode === "pre-commit") {
    await bumpServiceWorkerCache();
  } else if (mode === "post-commit") {
    pushAfterCommit();
  } else {
    console.error(
      "[git-hook] Usage: node git-hook.js <pre-commit|post-commit>"
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
