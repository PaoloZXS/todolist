import fs from "fs/promises";
import { execSync } from "child_process";

const serviceWorkerPath = new URL("../service-worker.js", import.meta.url);

function run(command) {
  return execSync(command, {
    stdio: "inherit",
    shell: true
  });
}

async function bumpCacheVersion() {
  const source = await fs.readFile(serviceWorkerPath, "utf8");
  const updated = source.replace(
    /const CACHE_NAME = "cose-da-fare-cache-v(\d+)";/,
    (_, version) =>
      `const CACHE_NAME = "cose-da-fare-cache-v${Number(version) + 1}";`
  );

  if (updated === source) {
    throw new Error("Version string not found in service-worker.js");
  }

  await fs.writeFile(serviceWorkerPath, updated, "utf8");
  return updated.match(/const CACHE_NAME = "cose-da-fare-cache-v(\d+)";/)[1];
}

async function main() {
  console.log("[release] Bumping service worker cache version...");
  const newVersion = await bumpCacheVersion();
  console.log(
    `[release] Updated service worker cache version to v${newVersion}`
  );

  run("git add .");

  try {
    run(
      `git commit -m "Release: bump service worker cache v${newVersion} and push changes"`
    );
  } catch (error) {
    console.error(
      "[release] Commit failed. Make sure there are staged changes to commit."
    );
    process.exit(1);
  }

  run("git push");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
