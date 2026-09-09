import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const operation = process.argv[2];
if (!["build", "verify"].includes(operation))
  throw new Error("Use release.mjs build or verify");
const env = {
  ...process.env,
  SITE_BUILD: "production",
  ASTRO_TELEMETRY_DISABLED: "1",
};
const steps =
  operation === "verify"
    ? ["verify"]
    : ["check:upstream", "check", "build", "check:output"];
for (const step of steps) {
  const result = spawnSync(
    process.execPath,
    [process.env.npm_execpath, "run", step],
    {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env,
      stdio: "inherit",
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
