import { readFile } from "node:fs/promises";
import { auditBaseline } from "./baseline-audit.mjs";
const root = new URL("../../", import.meta.url);
const original = JSON.parse(await readFile(new URL("migration/content-baseline.json", root), "utf8"));
const retired = JSON.parse(await readFile(new URL("migration/retired-legacy-files.json", root), "utf8"));
const report = await auditBaseline(original, retired, path => readFile(new URL(path, root)));
if (report.failures.length) {
  console.error("Historical baseline audit failed. Review real content changes; never auto-refresh the original manifest.\n" + report.failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Historical audit passed: ${report.preserved} original files unchanged; ${report.retiredFromBaseline} original legacy entries intentionally removed (${report.retiredTotal} documented retired files absent).`);
}
