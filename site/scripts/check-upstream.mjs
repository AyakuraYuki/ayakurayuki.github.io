import { adapterPatch } from "./adapter-patch.mjs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
const root = new URL("../../", import.meta.url);
const lock = JSON.parse(
  await readFile(new URL("migration/rhine-upstream.lock.json", root), "utf8"),
);
const recordedPatch = await readFile(
  new URL("migration/rhine-adapter.patch", root),
  "utf8",
);
if (adapterPatch() !== recordedPatch)
  throw new Error(
    "Blog adapter diff changed. Review and refresh migration/rhine-adapter.patch explicitly; never overwrite vendor/rhine.",
  );
let checked = 0;
for (const file of lock.importedFiles) {
  const bytes = await readFile(new URL(file.destination, root));
  if (createHash("sha256").update(bytes).digest("hex") !== file.sha256)
    throw new Error(`Imported upstream file changed: ${file.destination}`);
  checked++;
}
const source = process.argv[2];
if (source) {
  const commit = execFileSync("git", ["-C", source, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (commit !== lock.commit)
    throw new Error(
      `Upstream HEAD moved (${commit}); integration is pinned to ${lock.commit}. Review an upgrade, do not silently overwrite.`,
    );
  for (const file of lock.files) {
    const bytes = await readFile(path.join(source, file.path));
    if (createHash("sha256").update(bytes).digest("hex") !== file.sha256)
      throw new Error(
        `Upstream working copy differs from baseline: ${file.path}`,
      );
  }
  console.log(
    `Upstream verified: ${lock.files.length} files at ${lock.commit}.`,
  );
}
console.log(
  `Imported files verified: ${checked}. Pinned runtime/models and reviewed adapter patch verified; builds do not read the upstream checkout.`,
);
