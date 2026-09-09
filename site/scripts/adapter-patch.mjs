import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const site = fileURLToPath(new URL("../", import.meta.url));
export function adapterPatch() {
  let patch = "";
  for (const file of ["main.ts", "scene.ts", "model-viewer.ts"]) {
    const result = spawnSync(
      "git",
      [
        "-c",
        "core.autocrlf=false",
        "diff",
        "--no-index",
        "--no-ext-diff",
        "--no-color",
        "--src-prefix=a/",
        "--dst-prefix=b/",
        `vendor/rhine/src/${file}`,
        `src/archive/${file}`,
      ],
      { cwd: site, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
    );
    if (result.error || ![0, 1].includes(result.status))
      throw new Error(result.error?.message ?? result.stderr);
    patch += result.stdout;
  }
  return patch;
}
