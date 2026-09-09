import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";

test("migration workflow cannot deploy Pages and keeps dependencies pinned", async () => {
  const workflow = parse(
    await readFile("../.github/workflows/rhine-preview.yml", "utf8"),
  );
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.deepEqual(workflow.on.push.branches, ["codex/rhine-blog"]);
  for (const job of Object.values(workflow.jobs) as Array<
    Record<string, any>
  >) {
    assert.equal(job.environment, undefined);
    for (const step of job.steps) {
      if (step.uses) {
        assert.match(step.uses, /@[a-f0-9]{40}$/);
        assert.ok(!step.uses.includes("deploy-pages"));
      }
    }
  }
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  for (const version of Object.values({
    ...pkg.dependencies,
    ...pkg.devDependencies,
  }))
    assert.match(String(version), /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.private, true);
});
