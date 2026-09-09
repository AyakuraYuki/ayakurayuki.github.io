import test from "node:test";
import assert from "node:assert/strict";
import { buildSettings, siteIdentity } from "../build-settings.mjs";
import { validateReleaseIntent } from "../scripts/release-guard.mjs";

test("indexing and output directories require an explicit production build", () => {
  assert.equal(buildSettings("preview").robots, "noindex, nofollow");
  assert.equal(buildSettings("production").robots, "index, follow");
  assert.notEqual(
    buildSettings("preview").outDir,
    buildSettings("production").outDir,
  );
  assert.throws(() => buildSettings("prod"), /Unsupported/);
  assert.equal(new URL(siteIdentity.origin).hostname, "blog.ayakurayuki.cc");
});
test("release intent rejects moving refs and accidental publication", () => {
  const sha = "a".repeat(40);
  assert.throws(
    () =>
      validateReleaseIntent({
        expected: "main",
        actual: sha,
        publish: false,
        confirmation: "",
      }),
    /exact/,
  );
  assert.throws(
    () =>
      validateReleaseIntent({
        expected: sha,
        actual: "b".repeat(40),
        publish: false,
        confirmation: "",
      }),
    /exact/,
  );
  assert.throws(
    () =>
      validateReleaseIntent({
        expected: sha,
        actual: sha,
        publish: true,
        confirmation: "",
      }),
    /confirmation/,
  );
  assert.doesNotThrow(() =>
    validateReleaseIntent({
      expected: sha,
      actual: sha,
      publish: false,
      confirmation: "",
    }),
  );
  assert.doesNotThrow(() =>
    validateReleaseIntent({
      expected: sha,
      actual: sha,
      publish: true,
      confirmation: "blog.ayakurayuki.cc",
    }),
  );
});
