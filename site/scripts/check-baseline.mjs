import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../../", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("migration/content-baseline.json", root), "utf8"),
);
const failures = [];
for (const entry of manifest.files) {
  try {
    const bytes = await readFile(new URL(entry.path, root));
    if (
      bytes.length !== entry.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== entry.sha256
    )
      failures.push(entry.path);
  } catch {
    failures.push(`${entry.path} (missing)`);
  }
}
if (failures.length) {
  console.error(
    "Migration baseline changed. Review content sync explicitly; never auto-refresh this manifest.\n" +
      failures.join("\n"),
  );
  process.exitCode = 1;
} else
  console.log(
    `Baseline intact: ${manifest.files.length} legacy content/config/asset files; no original bytes changed.`,
  );
