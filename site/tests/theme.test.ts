import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";

test("the active Astro site does not initialize or install Hugo Stack", () => {
  assert.equal(existsSync("../themes/hugo-theme-stack"), false);
  if (existsSync("../.gitmodules")) {
    assert.ok(!readFileSync("../.gitmodules", "utf8").includes("hugo-theme-stack"));
  }
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    assert.ok(!/hugo|hugo-theme-stack/i.test(name));
  }
  for (const file of ["rhine-preview.yml", "blog-release.yml"]) {
    const workflow = parse(readFileSync(`../.github/workflows/${file}`, "utf8"));
    const jobs = Object.values(workflow.jobs) as Array<{steps: Array<{uses?: string; with?: {submodules?: boolean}}>}>;
    const checkouts = jobs.flatMap(job => job.steps).filter(step => step.uses?.startsWith("actions/checkout@"));
    assert.ok(checkouts.length > 0);
    checkouts.forEach(step => assert.equal(step.with?.submodules, false));
  }
});
