import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { auditBaseline } from "../scripts/baseline-audit.mjs";

const old = Buffer.from("legacy"), content = Buffer.from("article");
const entry = (path: string, bytes: Buffer) => ({ path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
const original = { files: [entry("legacy", old), entry("article", content)] };
const retirement = { files: [entry("legacy", old)] };
const reader = (files: Record<string, Buffer>) => async (path: string) => {
  if (Object.hasOwn(files, path)) return files[path];
  throw Object.assign(new Error("Missing fixture"), {code: "ENOENT"});
};

test("documented retirements preserve the immutable audit of retained content", async () => {
  const report = await auditBaseline(original, retirement, reader({article: content}));
  assert.equal(report.preserved, 1);
  assert.equal(report.retiredFromBaseline, 1);
  assert.deepEqual(report.failures, []);
});
test("audit rejects unexpected content loss, changed retirement hashes and reintroduced files", async () => {
  assert.ok((await auditBaseline(original, retirement, reader({}))).failures.some(e => e.includes("article")));
  assert.ok((await auditBaseline(original, {files:[entry("legacy", content)]}, reader({article:content}))).failures.some(e => e.includes("does not match")));
  assert.ok((await auditBaseline(original, retirement, reader({article:content,legacy:old}))).failures.some(e => e.includes("reappeared")));
  const blocked = async () => { throw Object.assign(new Error("Denied"), {code:"EACCES"}); };
  assert.ok((await auditBaseline(original, retirement, blocked)).failures.some(e => e.includes("cannot verify absence")));
});
test("working branch has no retired Hugo runtime; active application and author assets remain", () => {
  const ledger = JSON.parse(readFileSync("../migration/retired-legacy-files.json", "utf8"));
  for (const item of ledger.files) assert.equal(existsSync(`../${item.path}`), false, item.path);
  for (const file of ["../CNAME", "../content/post", "../content/page", "../assets/img/avatar.png", "../static/favicon.ico", "src/layouts/SiteLayout.astro", "src/pages/robots.txt.ts", "src/archive/main.ts", "../.github/workflows/blog-release.yml"])
    assert.equal(existsSync(file), true, file);
});
