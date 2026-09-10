import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";

test("regular CI cannot deploy Pages and keeps dependencies pinned", async () => {
  const workflow = parse(
    await readFile("../.github/workflows/rhine-preview.yml", "utf8"),
  );
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.deepEqual(workflow.on.push.branches, ["rhine-blog", "codex/rhine-blog"]);
  assert.deepEqual(workflow.on.pull_request.branches, ["rhine-blog", "codex/rhine-blog"]);
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

test("release workflow is manual, exact-commit gated, and publish defaults to false", async () => {
  const workflow = parse(
    await readFile("../.github/workflows/blog-release.yml", "utf8"),
  );
  assert.deepEqual(Object.keys(workflow.on), ["workflow_dispatch"]);
  assert.equal(workflow.on.workflow_dispatch.inputs.publish.default, false);
  assert.equal(
    workflow.on.workflow_dispatch.inputs.expected_commit.required,
    true,
  );
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.jobs.deploy.needs, "build");
  const guard = workflow.jobs.build.steps.find((step: any) => step.run === "node scripts/release-guard.mjs --check");
  assert.equal(guard.env.WORKFLOW_REF, "${{ github.ref }}");
  const pack = workflow.jobs.build.steps.find((step: any) => step.uses?.startsWith("actions/upload-pages-artifact@"));
  assert.equal(pack.if, workflow.jobs.deploy.if);
  assert.match(workflow.jobs.deploy.if, /github\.ref == 'refs\/heads\/rhine-blog'/);
  assert.match(workflow.jobs.deploy.if, /github\.ref == 'refs\/heads\/codex\/rhine-blog'/);
  assert.ok(!workflow.jobs.deploy.if.includes("refs/heads/hugo"));
  assert.match(workflow['run-name'], /github\.ref_name/);
  assert.match(workflow.jobs.deploy.if, /inputs.publish/);
  assert.match(
    workflow.jobs.deploy.if,
    /inputs.confirmation == 'blog.ayakurayuki.cc'/,
  );
  assert.equal(workflow.jobs.deploy.environment.name, "github-pages");
  assert.equal(workflow.jobs.deploy.permissions.pages, "write");
  assert.equal(workflow.concurrency["cancel-in-progress"], false);
  assert.ok(
    workflow.jobs.build.steps.some(
      (s: any) => s.run === "npm run verify:release",
    ),
  );
  assert.ok(
    workflow.jobs.build.steps.some(
      (s: any) =>
        s.run === "npm run test:browser" && s.env.SITE_BUILD === "production",
    ),
  );
  for (const job of Object.values(workflow.jobs) as any[])
    for (const step of job.steps)
      if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/);
});
